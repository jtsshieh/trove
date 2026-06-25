'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
	AlertCircle,
	Check,
	CheckCircle2,
	Layers,
	Loader2,
	ScanLine,
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
import { uploadImageFile } from '@/lib/image-pipeline';
import { cn } from '@/lib/utils';

import { createDocumentBatch, scanDocumentImage } from './_data/api';
import { documentsKeys } from './_data/queries';

/** Where one row's scan stands. Documents have no background removal — scan only. */
type OpState = 'idle' | 'running' | 'done' | 'error';

/** A single dropped photo as it moves through upload → scan → create. */
interface BulkItem {
	id: string;
	file: File;
	previewUrl: string;
	scan: OpState;
	scanError?: string;
	created: boolean;
	createError?: string;
	/** The (scanned or hand-typed) document name. */
	name: string;
}

let counter = 0;
function nextId() {
	counter += 1;
	return `bulk-doc-${counter}`;
}

export function BulkAddDocumentsDialog() {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [items, setItems] = useState<BulkItem[]>([]);
	const [stage, setStage] = useState<'select' | 'review'>('select');
	const [dragOver, setDragOver] = useState(false);
	const [creating, setCreating] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	// Async ops read the LATEST items (a parallel scan may have changed a row since the
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
				previewUrl: URL.createObjectURL(file),
				scan: 'idle',
				created: false,
				name: '',
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

	// Scan for one item: upload the photo (only so the model can read it — the key is
	// never stored on the document), then suggest a name. Failures keep the row for
	// manual entry.
	async function scanOne(id: string) {
		const target = itemsRef.current.find((i) => i.id === id);
		if (!target || target.scan === 'running' || target.created) return;
		patch(id, (i) => ({ ...i, scan: 'running', scanError: undefined }));

		let imageKey: string;
		try {
			imageKey = await uploadImageFile(target.file);
		} catch {
			patch(id, (i) => ({
				...i,
				scan: 'error',
				scanError: 'Upload failed. Retry.',
			}));
			return;
		}

		try {
			const res = await scanDocumentImage(imageKey);
			const name = res.suggestion?.name;
			patch(id, (i) => ({
				...i,
				scan: 'done',
				scanError: undefined,
				// Only overwrite an empty name so a user's hand-typed value isn't clobbered.
				name:
					typeof name === 'string' && name.trim() !== '' && i.name.trim() === ''
						? name
						: i.name,
			}));
		} catch {
			patch(id, (i) => ({
				...i,
				scan: 'error',
				scanError: 'Scan failed. Type the name by hand.',
			}));
		}
	}

	// "Run on all": scan every not-yet-created row in parallel. Each row greys/un-greys
	// its own field as its scan starts and finishes.
	function runBatch() {
		for (const item of itemsRef.current) {
			if (item.created) continue;
			void scanOne(item.id);
		}
	}

	function patchName(id: string, name: string) {
		patch(id, (i) => ({ ...i, name }));
	}

	function isReady(i: BulkItem) {
		return !i.created && i.name.trim() !== '';
	}

	async function createAll() {
		const ready = items.filter(isReady);
		if (ready.length === 0) {
			toast.error('Give at least one document a name');
			return;
		}
		setCreating(true);
		try {
			const data = await createDocumentBatch(
				ready.map((i) => ({ name: i.name.trim() })),
			);
			const failedIdx = new Set(data.failed);
			setItems((prev) =>
				prev.map((i) => {
					const pos = ready.findIndex((r) => r.id === i.id);
					if (pos === -1) return i;
					if (failedIdx.has(pos)) {
						return { ...i, createError: 'Create failed. Retry.' };
					}
					return { ...i, created: true, createError: undefined };
				}),
			);
			await queryClient.invalidateQueries({ queryKey: documentsKeys.all });
			if (failedIdx.size === 0) {
				toast.success(
					`Added ${data.created} document${data.created === 1 ? '' : 's'}`,
				);
				setOpen(false);
				reset();
			} else {
				toast.warning(`Added ${data.created}, ${data.failed.length} failed`);
			}
		} catch {
			toast.error('Could not create documents');
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
				className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
				data-testid="bulk-add-dialog"
			>
				<DialogHeader className="border-b p-4">
					<DialogTitle>Bulk add documents</DialogTitle>
					<DialogDescription>
						{stage === 'select'
							? 'Drop or pick several photos. Add or remove any, then continue.'
							: 'Scan all the photos for names at once or one at a time, then create them.'}
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
							onRun={runBatch}
							onPatchName={patchName}
							onScan={scanOne}
							onRemove={removeItem}
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
				<Upload className="size-6 text-muted-foreground" />
				<p className="text-sm font-medium">Drop photos here</p>
				<p className="text-xs text-muted-foreground">
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
							className="relative aspect-square overflow-hidden rounded-xl border bg-surface-sunken"
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
	onRun,
	onPatchName,
	onScan,
	onRemove,
}: {
	items: BulkItem[];
	onRun: () => void;
	onPatchName: (id: string, name: string) => void;
	onScan: (id: string) => void;
	onRemove: (id: string) => void;
}) {
	return (
		<div className="flex flex-col gap-3" data-testid="bulk-review">
			<div
				className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-surface-sunken/40 px-3 py-2"
				data-testid="bulk-review-toolbar"
			>
				<span className="text-sm font-medium">
					{items.length} document{items.length === 1 ? '' : 's'}
				</span>
				<Button
					type="button"
					size="sm"
					className="ml-auto"
					disabled={items.length === 0}
					onClick={onRun}
					data-testid="bulk-run"
				>
					<ScanLine /> Scan all
				</Button>
			</div>
			{items.map((item) => (
				<DraftRow
					key={item.id}
					item={item}
					onPatchName={onPatchName}
					onScan={onScan}
					onRemove={onRemove}
				/>
			))}
		</div>
	);
}

function DraftRow({
	item,
	onPatchName,
	onScan,
	onRemove,
}: {
	item: BulkItem;
	onPatchName: (id: string, name: string) => void;
	onScan: (id: string) => void;
	onRemove: (id: string) => void;
}) {
	const id = useId();
	const { scan, created } = item;
	const scanRunning = scan === 'running';
	const fieldsDisabled = scanRunning || created;
	const error = item.scanError || item.createError;

	return (
		<div
			data-testid="bulk-draft-row"
			data-scan={scan}
			data-created={created || undefined}
			className={cn(
				'flex gap-3 rounded-xl border p-3',
				created && 'border-brand/40 bg-brand-subtle/30',
				item.createError && 'border-destructive/40',
			)}
		>
			<div className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-lg bg-surface-sunken sm:w-24">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={item.previewUrl}
					alt=""
					className="size-full object-contain"
				/>
				{created && (
					<div className="absolute inset-0 grid place-content-center bg-background/60">
						<CheckCircle2 className="size-5 text-brand" />
					</div>
				)}
			</div>

			<div className="flex min-w-0 flex-1 flex-col gap-2">
				<div className="flex flex-col gap-1">
					<Label htmlFor={`${id}-name`} className="text-xs">
						Name
					</Label>
					<div className="flex items-center gap-2">
						<Input
							id={`${id}-name`}
							value={item.name}
							disabled={fieldsDisabled}
							placeholder="Document name"
							data-testid="bulk-name"
							onChange={(e) => onPatchName(item.id, e.target.value)}
						/>
						<Button
							type="button"
							size="sm"
							variant="outline"
							className="shrink-0 px-2"
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
				<div className="flex items-center justify-between gap-2">
					{error ? (
						<span
							className="flex items-center gap-1 text-xs text-destructive"
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
							data-testid="bulk-draft-remove"
						>
							<X />
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
