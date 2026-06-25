'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Brand, BathroomType } from '@/generated/prisma/client';
import { BathroomForm, BathroomNature } from '@/generated/prisma/enums';
import {
	AlertCircle,
	Check,
	CheckCircle2,
	ImageOff,
	Layers,
	Loader2,
	Pencil,
	ScanLine,
	Sparkles,
	Upload,
	X,
} from 'lucide-react';
import {
	useEffect,
	useId,
	useRef,
	useState,
	type ChangeEvent,
	type DragEvent,
} from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { ImageEditorDialog } from '@/components/image-editor-dialog';
import { brandsQueryOptions } from '@/app/(app)/closet/clothing/brands/_data/queries';
import { removeImageBackground, uploadImageFile } from '@/lib/image-pipeline';
import { imageSrc } from '@/lib/images';
import { cn } from '@/lib/utils';

import { createBathroomProduct, scanBathroomImage } from './_data/api';
import { bathroomKeys, bathroomTypesQueryOptions } from './_data/queries';

/** Independent per-operation state so background removal and scan can run at the
 *  same time on one item and each updates its own slice of the UI. */
type OpState = 'idle' | 'running' | 'done' | 'error';

/** A single dropped photo as it moves through upload → process → create. */
interface BulkItem {
	id: string;
	/** Current image (the cutout once background is removed, else the original). */
	file: File;
	/** Pristine original, the base for background removal + the editor's Keep tool. */
	originalFile: File;
	previewUrl: string;
	/** Server key for the CURRENT `file`, or null when it still needs uploading. */
	imageKey?: string | null;
	bg: OpState;
	bgError?: string;
	scan: OpState;
	scanError?: string;
	created: boolean;
	createError?: string;
	draft: Draft;
}

interface Draft {
	name: string;
	nature: BathroomNature | '';
	form: BathroomForm | '';
	type: string;
	brand: string;
}

function emptyDraft(): Draft {
	return { name: '', nature: '', form: '', type: '', brand: '' };
}

/** Overwrite the scannable fields from a fresh suggestion. */
function applySuggestion(
	suggestion: Record<string, unknown> | null | undefined,
): Draft {
	const d = emptyDraft();
	if (suggestion) {
		if (typeof suggestion.name === 'string') d.name = suggestion.name;
		if (
			suggestion.nature === 'Consumable' ||
			suggestion.nature === 'Appliance' ||
			suggestion.nature === 'Launderable'
		) {
			d.nature = suggestion.nature;
		}
		if (
			suggestion.form === 'Liquid' ||
			suggestion.form === 'Gel' ||
			suggestion.form === 'Aerosol' ||
			suggestion.form === 'Cream' ||
			suggestion.form === 'Paste' ||
			suggestion.form === 'Powder'
		) {
			d.form = suggestion.form;
		}
		if (typeof suggestion.type === 'string') d.type = suggestion.type;
		if (typeof suggestion.brand === 'string') d.brand = suggestion.brand;
	}
	return d;
}

let counter = 0;
function nextId() {
	counter += 1;
	return `bulk-bath-${counter}`;
}

export function BulkAddBathroomDialog() {
	const queryClient = useQueryClient();
	const { data: types } = useQuery(bathroomTypesQueryOptions);
	const { data: brands } = useQuery(brandsQueryOptions);
	const typeNames = (types ?? []).map((t: BathroomType) => t.name);
	const brandNames = (brands ?? [])
		.filter((b: Brand) => b.domains.includes('Bathroom'))
		.map((b: Brand) => b.name);

	const [open, setOpen] = useState(false);
	const [items, setItems] = useState<BulkItem[]>([]);
	const [stage, setStage] = useState<'select' | 'review'>('select');
	const [dragOver, setDragOver] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	// Which operations the "Run on all" button kicks off. Both on by default so the
	// one button does the whole job.
	const [runBg, setRunBg] = useState(true);
	const [runScan, setRunScan] = useState(true);
	const [creating, setCreating] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	// Async ops read the LATEST items (a parallel op may have changed a row since the
	// call started), so mirror state into a ref.
	const itemsRef = useRef<BulkItem[]>(items);
	itemsRef.current = items;

	// Free object URLs when items are dropped/cleared and on unmount.
	useEffect(() => {
		return () => {
			for (const item of itemsRef.current) URL.revokeObjectURL(item.previewUrl);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	function reset() {
		setItems((prev) => {
			for (const item of prev) URL.revokeObjectURL(item.previewUrl);
			return [];
		});
		setStage('select');
		setCreating(false);
	}

	function addFiles(fileList: FileList | null) {
		if (!fileList) return;
		const next: BulkItem[] = [];
		for (const file of Array.from(fileList)) {
			if (!file.type.startsWith('image/')) continue;
			next.push({
				id: nextId(),
				file,
				originalFile: file,
				previewUrl: URL.createObjectURL(file),
				imageKey: undefined,
				bg: 'idle',
				scan: 'idle',
				created: false,
				draft: emptyDraft(),
			});
		}
		if (next.length === 0) {
			toast.error('Drop image files to add them');
			return;
		}
		setItems((prev) => [...prev, ...next]);
	}

	function onSelect(event: ChangeEvent<HTMLInputElement>) {
		addFiles(event.target.files);
		event.target.value = '';
	}

	function onDrop(event: DragEvent<HTMLDivElement>) {
		event.preventDefault();
		setDragOver(false);
		addFiles(event.dataTransfer.files);
	}

	function removeItem(id: string) {
		setItems((prev) => {
			const target = prev.find((i) => i.id === id);
			if (target) URL.revokeObjectURL(target.previewUrl);
			return prev.filter((i) => i.id !== id);
		});
	}

	function patch(id: string, fn: (item: BulkItem) => BulkItem) {
		setItems((prev) => prev.map((i) => (i.id === id ? fn(i) : i)));
	}

	// Background removal for one item: cut out its pristine original and swap the
	// displayed/uploaded image to the cutout. Independent of scan — only the picture
	// is greyed while this runs. Failures fail their own row.
	async function removeBgOne(id: string) {
		const target = itemsRef.current.find((i) => i.id === id);
		if (!target || target.bg === 'running' || target.created) return;
		patch(id, (i) => ({ ...i, bg: 'running', bgError: undefined }));
		let cutout: File;
		try {
			cutout = await removeImageBackground(target.originalFile);
		} catch {
			patch(id, (i) => ({
				...i,
				bg: 'error',
				bgError: 'Background removal failed. Retry.',
			}));
			return;
		}
		patch(id, (i) => {
			URL.revokeObjectURL(i.previewUrl);
			return {
				...i,
				file: cutout,
				previewUrl: URL.createObjectURL(cutout),
				// The image changed, so any uploaded key is stale.
				imageKey: null,
				bg: 'done',
				bgError: undefined,
			};
		});
	}

	// Scan for one item: upload the current image, then ask the model to fill the
	// draft. Independent of background removal — only the text is greyed while this
	// runs. Failures keep the uploaded photo for manual entry.
	async function scanOne(id: string) {
		const target = itemsRef.current.find((i) => i.id === id);
		if (!target || target.scan === 'running' || target.created) return;
		const fileAtScan = target.file;
		patch(id, (i) => ({ ...i, scan: 'running', scanError: undefined }));

		let imageKey: string;
		try {
			imageKey = await uploadImageFile(fileAtScan);
		} catch {
			patch(id, (i) => ({
				...i,
				scan: 'error',
				scanError: 'Upload failed. Retry.',
			}));
			return;
		}

		// Adopt the uploaded key only if the row's image is still the one we scanned —
		// a parallel background removal may have swapped the file and nulled the key.
		const keyIfCurrent = (i: BulkItem) =>
			i.file === fileAtScan ? imageKey : i.imageKey;
		try {
			const res = await scanBathroomImage(imageKey);
			const suggestion = res.suggestion as
				| Record<string, unknown>
				| null
				| undefined;
			patch(id, (i) => ({
				...i,
				scan: 'done',
				scanError: undefined,
				imageKey: keyIfCurrent(i),
				draft: applySuggestion(suggestion),
			}));
		} catch {
			patch(id, (i) => ({
				...i,
				scan: 'error',
				scanError: 'Scan failed. Fill it in by hand.',
				imageKey: keyIfCurrent(i),
			}));
		}
	}

	// "Run on all": kick off the checked operations across every not-yet-created
	// item, all in parallel. Each row greys/un-greys its own picture + text as its
	// own work starts and finishes.
	function runBatch() {
		if (!runBg && !runScan) return;
		for (const item of itemsRef.current) {
			if (item.created) continue;
			if (runBg) void removeBgOne(item.id);
			if (runScan) void scanOne(item.id);
		}
	}

	// Replace a photo with its edited version (cropped / erased / cut out). It's the
	// same product, so the scan draft + bg state stay valid; only the uploaded copy
	// is stale, so null the key to force a re-upload on create.
	function applyEdit(id: string, working: File, base: File) {
		patch(id, (i) => {
			URL.revokeObjectURL(i.previewUrl);
			return {
				...i,
				file: working,
				originalFile: base,
				previewUrl: URL.createObjectURL(working),
				imageKey: null,
			};
		});
	}

	function patchDraft(id: string, draftPatch: Partial<Draft>) {
		patch(id, (i) => ({ ...i, draft: { ...i.draft, ...draftPatch } }));
	}

	function isReady(i: BulkItem) {
		return !i.created && i.draft.name.trim() && i.draft.nature !== '';
	}

	async function createAll() {
		const ready = items.filter(isReady);
		if (ready.length === 0) {
			toast.error('Fill name and nature on at least one item');
			return;
		}
		setCreating(true);
		try {
			// Ensure every row's image is persisted. Background removal + edits clear
			// the stored key, so (re)upload the current file first.
			const prepared = await Promise.all(
				ready.map(async (i) => {
					let imageKey = i.imageKey ?? undefined;
					if (!imageKey) {
						try {
							imageKey = await uploadImageFile(i.file);
						} catch {
							imageKey = undefined;
						}
					}
					return { item: i, imageKey };
				}),
			);

			// Create each product independently (one default variant; no batches/units)
			// so one bad row never loses the rest — failed rows keep their error for a
			// retry, mirroring the clothing batch's per-row failure semantics.
			const results = await Promise.all(
				prepared.map(async ({ item: i, imageKey }) => {
					const nature = i.draft.nature as BathroomNature;
					try {
						await createBathroomProduct({
							name: i.draft.name.trim(),
							nature,
							form:
								nature === 'Consumable' && i.draft.form
									? (i.draft.form as BathroomForm)
									: null,
							type: i.draft.type.trim() || null,
							brand: i.draft.brand.trim() || null,
							imageKey,
							variants: [{ label: null, capacityMl: null }],
						});
						return { id: i.id, ok: true as const };
					} catch {
						return { id: i.id, ok: false as const };
					}
				}),
			);

			const failed = new Set(results.filter((r) => !r.ok).map((r) => r.id));
			setItems((prev) =>
				prev.map((i) => {
					if (!ready.some((r) => r.id === i.id)) return i;
					if (failed.has(i.id)) {
						return { ...i, createError: 'Create failed. Retry.' };
					}
					return { ...i, created: true, createError: undefined };
				}),
			);
			await queryClient.invalidateQueries({ queryKey: bathroomKeys.products });
			await queryClient.invalidateQueries({ queryKey: bathroomKeys.types });

			const createdCount = results.length - failed.size;
			if (failed.size === 0) {
				toast.success(
					`Added ${createdCount} item${createdCount === 1 ? '' : 's'}`,
				);
				setOpen(false);
				reset();
			} else {
				toast.warning(`Added ${createdCount}, ${failed.size} failed`);
			}
		} catch {
			toast.error('Could not create items');
		} finally {
			setCreating(false);
		}
	}

	const readyCount = items.filter(isReady).length;

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) reset();
			}}
		>
			<DialogTrigger
				render={
					<Button
						variant="outline"
						size="icon"
						className="gap-1 sm:w-auto sm:px-4 sm:py-2"
						data-testid="bulk-add-trigger"
					/>
				}
			>
				<Layers />
				<span className="hidden sm:block">Bulk add</span>
			</DialogTrigger>
			<DialogContent
				className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
				data-testid="bulk-add-dialog"
			>
				<DialogHeader className="border-b p-4">
					<DialogTitle>Bulk add products</DialogTitle>
					<DialogDescription>
						{stage === 'select'
							? 'Drop or pick several photos. Add or remove any, then continue.'
							: 'Remove backgrounds and scan, all at once or one at a time, then create them.'}
					</DialogDescription>
				</DialogHeader>

				<div
					className="min-h-0 flex-1 overflow-y-auto p-4"
					data-testid="bulk-add-body"
				>
					{stage === 'select' ? (
						<SelectStage
							items={items}
							dragOver={dragOver}
							inputRef={inputRef}
							onPick={() => inputRef.current?.click()}
							onSelect={onSelect}
							onDrop={onDrop}
							onDragOver={(e) => {
								e.preventDefault();
								setDragOver(true);
							}}
							onDragLeave={() => setDragOver(false)}
							onRemove={removeItem}
						/>
					) : (
						<ReviewStage
							items={items}
							typeNames={typeNames}
							brandNames={brandNames}
							runBg={runBg}
							runScan={runScan}
							onRunBgChange={setRunBg}
							onRunScanChange={setRunScan}
							onRun={runBatch}
							onPatch={patchDraft}
							onRemoveBg={removeBgOne}
							onScan={scanOne}
							onRemove={removeItem}
							onEdit={setEditingId}
						/>
					)}
				</div>

				<DialogFooter className="mx-0 mb-0 rounded-none border-t">
					{stage === 'select' ? (
						<Button
							type="button"
							disabled={items.length === 0}
							onClick={() => setStage('review')}
							data-testid="bulk-continue"
						>
							Continue ({items.length})
						</Button>
					) : (
						<>
							<Button
								type="button"
								variant="secondary"
								disabled={creating}
								onClick={() => setStage('select')}
							>
								Back
							</Button>
							<Button
								type="button"
								loading={creating}
								disabled={readyCount === 0}
								onClick={createAll}
								data-testid="bulk-create-all"
							>
								Create all ({readyCount})
							</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
			<ImageEditorDialog
				open={editingId !== null}
				onOpenChange={(next) => {
					if (!next) setEditingId(null);
				}}
				file={items.find((i) => i.id === editingId)?.file ?? null}
				originalFile={
					items.find((i) => i.id === editingId)?.originalFile ?? null
				}
				onApply={(working, base) => {
					if (editingId) applyEdit(editingId, working, base);
				}}
			/>
		</Dialog>
	);
}

function SelectStage({
	items,
	dragOver,
	inputRef,
	onPick,
	onSelect,
	onDrop,
	onDragOver,
	onDragLeave,
	onRemove,
}: {
	items: BulkItem[];
	dragOver: boolean;
	inputRef: React.RefObject<HTMLInputElement | null>;
	onPick: () => void;
	onSelect: (event: ChangeEvent<HTMLInputElement>) => void;
	onDrop: (event: DragEvent<HTMLDivElement>) => void;
	onDragOver: (event: DragEvent<HTMLDivElement>) => void;
	onDragLeave: () => void;
	onRemove: (id: string) => void;
}) {
	return (
		<div className="flex flex-col gap-4">
			<div
				onDrop={onDrop}
				onDragOver={onDragOver}
				onDragLeave={onDragLeave}
				className={cn(
					'flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-8 text-center transition-colors',
					dragOver ? 'border-ring bg-muted' : 'border-input',
				)}
				data-testid="bulk-dropzone"
			>
				<Upload className="text-muted-foreground size-6" />
				<p className="text-sm font-medium">Drop photos here</p>
				<p className="text-muted-foreground text-xs">
					or pick several from your device
				</p>
				<input
					ref={inputRef}
					type="file"
					accept="image/*"
					multiple
					className="hidden"
					onChange={onSelect}
					data-testid="bulk-file-input"
				/>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="mt-1"
					onClick={onPick}
				>
					<Upload /> Choose photos
				</Button>
			</div>

			{items.length > 0 && (
				<div
					className="grid grid-cols-2 gap-3 sm:grid-cols-3"
					data-testid="bulk-grid"
				>
					{items.map((item) => (
						<div
							key={item.id}
							data-testid="bulk-tile"
							className="bg-surface-sunken relative aspect-square overflow-hidden rounded-xl border"
						>
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								src={item.previewUrl}
								alt=""
								className="size-full object-contain"
							/>
							<Button
								type="button"
								size="icon-sm"
								variant="secondary"
								className="absolute top-1 right-1"
								onClick={() => onRemove(item.id)}
								aria-label="Remove photo"
								data-testid="bulk-tile-remove"
							>
								<X />
							</Button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

function ReviewStage({
	items,
	typeNames,
	brandNames,
	runBg,
	runScan,
	onRunBgChange,
	onRunScanChange,
	onRun,
	onPatch,
	onRemoveBg,
	onScan,
	onRemove,
	onEdit,
}: {
	items: BulkItem[];
	typeNames: string[];
	brandNames: string[];
	runBg: boolean;
	runScan: boolean;
	onRunBgChange: (value: boolean) => void;
	onRunScanChange: (value: boolean) => void;
	onRun: () => void;
	onPatch: (id: string, patch: Partial<Draft>) => void;
	onRemoveBg: (id: string) => void;
	onScan: (id: string) => void;
	onRemove: (id: string) => void;
	onEdit: (id: string) => void;
}) {
	return (
		<div className="flex flex-col gap-3" data-testid="bulk-review">
			<div
				className="bg-surface-sunken/40 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-3 py-2"
				data-testid="bulk-review-toolbar"
			>
				<span className="text-sm font-medium">
					{items.length} item{items.length === 1 ? '' : 's'}
				</span>
				<label className="flex cursor-default items-center gap-2 text-sm select-none">
					<Checkbox
						checked={runBg}
						onCheckedChange={(c) => onRunBgChange(c === true)}
						data-testid="bulk-runbg"
					/>
					Remove backgrounds
				</label>
				<label className="flex cursor-default items-center gap-2 text-sm select-none">
					<Checkbox
						checked={runScan}
						onCheckedChange={(c) => onRunScanChange(c === true)}
						data-testid="bulk-runscan"
					/>
					Scan
				</label>
				<Button
					type="button"
					size="sm"
					className="ml-auto"
					disabled={(!runBg && !runScan) || items.length === 0}
					onClick={onRun}
					data-testid="bulk-run"
				>
					Run on all
				</Button>
			</div>
			{items.map((item) => (
				<DraftRow
					key={item.id}
					item={item}
					typeNames={typeNames}
					brandNames={brandNames}
					onPatch={onPatch}
					onRemoveBg={onRemoveBg}
					onScan={onScan}
					onRemove={onRemove}
					onEdit={onEdit}
				/>
			))}
		</div>
	);
}

function DraftRow({
	item,
	typeNames,
	brandNames,
	onPatch,
	onRemoveBg,
	onScan,
	onRemove,
	onEdit,
}: {
	item: BulkItem;
	typeNames: string[];
	brandNames: string[];
	onPatch: (id: string, patch: Partial<Draft>) => void;
	onRemoveBg: (id: string) => void;
	onScan: (id: string) => void;
	onRemove: (id: string) => void;
	onEdit: (id: string) => void;
}) {
	const id = useId();
	const { draft, bg, scan, created } = item;
	// The picture greys only while background removal runs; the text greys only
	// while the scan runs. They are independent so both can happen at once.
	const bgRunning = bg === 'running';
	const scanRunning = scan === 'running';
	const fieldsDisabled = scanRunning || created;
	// Edit is blocked only while the PICTURE is busy (background removal swaps the
	// file). A running scan greys the text but leaves the photo editable.
	const editDisabled = bgRunning || created;
	const src = item.imageKey ? imageSrc(item.imageKey) : item.previewUrl;
	const error = item.scanError || item.bgError || item.createError;
	// Form is only meaningful for consumables — mirror the single-add dialog.
	const showForm = draft.nature === 'Consumable';

	return (
		<div
			data-testid="bulk-draft-row"
			data-bg={bg}
			data-scan={scan}
			data-created={created || undefined}
			className={cn(
				'flex gap-3 rounded-xl border p-3',
				created && 'border-brand/40 bg-brand-subtle/30',
				item.createError && 'border-destructive/40',
			)}
		>
			<div className="flex w-28 shrink-0 flex-col gap-1.5 sm:w-32">
				<button
					type="button"
					onClick={() => onEdit(item.id)}
					disabled={editDisabled}
					aria-label="Edit photo"
					data-testid="bulk-review-edit"
					className="group bg-surface-sunken enabled:hover-hover:hover:ring-2 enabled:hover-hover:hover:ring-ring relative aspect-square overflow-hidden rounded-lg"
				>
					{src ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={src}
							alt=""
							className={cn(
								'size-full object-contain transition-opacity',
								bgRunning && 'opacity-25',
							)}
							data-testid="bulk-row-image"
						/>
					) : (
						<ImageOff className="text-muted-foreground absolute inset-0 m-auto size-5" />
					)}
					{!editDisabled && (
						<div className="bg-background/0 text-foreground/0 group-hover:bg-background/40 group-hover:text-foreground absolute inset-0 grid place-content-center transition-colors">
							<Pencil className="size-5" />
						</div>
					)}
					{bgRunning && (
						<div className="absolute inset-0 grid place-content-center">
							<Loader2 className="size-5 animate-spin" />
						</div>
					)}
					{created && (
						<div className="bg-background/60 absolute inset-0 grid place-content-center">
							<CheckCircle2 className="text-brand size-5" />
						</div>
					)}
				</button>

				<div className="grid grid-cols-2 gap-1.5">
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="px-0"
						disabled={bgRunning || created}
						onClick={() => onRemoveBg(item.id)}
						title="Remove background"
						data-testid="bulk-row-removebg"
					>
						{bgRunning ? (
							<Loader2 className="animate-spin" />
						) : bg === 'done' ? (
							<Check />
						) : (
							<Sparkles />
						)}
					</Button>
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="px-0"
						disabled={scanRunning || created}
						onClick={() => onScan(item.id)}
						title="Scan"
						data-testid="bulk-row-scan"
					>
						{scanRunning ? (
							<Loader2 className="animate-spin" />
						) : scan === 'done' ? (
							<Check />
						) : (
							<ScanLine />
						)}
					</Button>
				</div>
			</div>

			<div className="flex min-w-0 flex-1 flex-col gap-2">
				<div
					className={cn(
						'grid grid-cols-2 gap-2 transition-opacity',
						scanRunning && 'opacity-50',
					)}
					data-testid="bulk-row-fields"
				>
					<div className="flex flex-col gap-1">
						<Label htmlFor={`${id}-name`} className="text-xs">
							Name
						</Label>
						<Input
							id={`${id}-name`}
							value={draft.name}
							disabled={fieldsDisabled}
							placeholder="e.g. Daily shampoo"
							data-testid="bulk-name"
							onChange={(e) => onPatch(item.id, { name: e.target.value })}
						/>
					</div>
					<DraftNatureSelect
						value={draft.nature}
						disabled={fieldsDisabled}
						onChange={(value) =>
							onPatch(item.id, {
								nature: value,
								// Drop a stale form when leaving Consumable.
								...(value === 'Consumable' ? {} : { form: '' }),
							})
						}
					/>
					{showForm && (
						<DraftFormSelect
							value={draft.form}
							disabled={fieldsDisabled}
							onChange={(value) => onPatch(item.id, { form: value })}
						/>
					)}
					<DraftDatalistInput
						label="Type"
						placeholder="e.g. Shampoo"
						value={draft.type}
						options={typeNames}
						disabled={fieldsDisabled}
						testid="bulk-type"
						onChange={(value) => onPatch(item.id, { type: value })}
					/>
					<DraftDatalistInput
						label="Brand"
						placeholder="e.g. Aesop"
						value={draft.brand}
						options={brandNames}
						disabled={fieldsDisabled}
						testid="bulk-brand"
						onChange={(value) => onPatch(item.id, { brand: value })}
					/>
				</div>
				<div className="flex items-center justify-between gap-2">
					{error ? (
						<span
							className="text-destructive flex items-center gap-1 text-xs"
							data-testid="bulk-row-error"
						>
							<AlertCircle className="size-3.5" /> {error}
						</span>
					) : (
						<span />
					)}
					{!created && (
						<Button
							type="button"
							size="icon-sm"
							variant="ghost"
							onClick={() => onRemove(item.id)}
							aria-label="Remove draft"
						>
							<X />
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}

function DraftNatureSelect({
	value,
	disabled,
	onChange,
}: {
	value: BathroomNature | '';
	disabled: boolean;
	onChange: (value: BathroomNature | '') => void;
}) {
	const id = useId();
	return (
		<div className="flex flex-col gap-1">
			<Label htmlFor={id} className="text-xs">
				Nature
			</Label>
			<Select
				value={value || null}
				onValueChange={(v) => onChange((v as BathroomNature) ?? '')}
				disabled={disabled}
				items={Object.keys(BathroomNature).map((v) => ({ value: v, label: v }))}
			>
				<SelectTrigger id={id} size="sm" data-testid="bulk-nature">
					<SelectValue placeholder="Nature" />
				</SelectTrigger>
				<SelectContent>
					{Object.keys(BathroomNature).map((option) => (
						<SelectItem key={option} value={option}>
							{option}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

function DraftFormSelect({
	value,
	disabled,
	onChange,
}: {
	value: BathroomForm | '';
	disabled: boolean;
	onChange: (value: BathroomForm | '') => void;
}) {
	const id = useId();
	return (
		<div className="flex flex-col gap-1">
			<Label htmlFor={id} className="text-xs">
				Form
			</Label>
			<Select
				value={value || null}
				onValueChange={(v) => onChange((v as BathroomForm) ?? '')}
				disabled={disabled}
				items={Object.keys(BathroomForm).map((v) => ({ value: v, label: v }))}
			>
				<SelectTrigger id={id} size="sm" data-testid="bulk-form">
					<SelectValue placeholder="Form" />
				</SelectTrigger>
				<SelectContent>
					{Object.keys(BathroomForm).map((option) => (
						<SelectItem key={option} value={option}>
							{option}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

/** Free-form input backed by a datalist of the user's existing values. */
function DraftDatalistInput({
	label,
	placeholder,
	value,
	options,
	disabled,
	testid,
	onChange,
}: {
	label: string;
	placeholder: string;
	value: string;
	options: string[];
	disabled: boolean;
	testid: string;
	onChange: (value: string) => void;
}) {
	const id = useId();
	const listId = useId();
	return (
		<div className="flex flex-col gap-1">
			<Label htmlFor={id} className="text-xs">
				{label}
			</Label>
			<Input
				id={id}
				value={value}
				disabled={disabled}
				placeholder={placeholder}
				list={listId}
				data-testid={testid}
				onChange={(e) => onChange(e.target.value)}
			/>
			<datalist id={listId}>
				{options.map((option) => (
					<option key={option} value={option} />
				))}
			</datalist>
		</div>
	);
}
