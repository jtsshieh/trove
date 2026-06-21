'use client';

import type { Clothing } from '@/generated/prisma/client';
import { ImageDown, Plus, Shirt, X } from 'lucide-react';
import {
	useEffect,
	useMemo,
	useRef,
	useState,
	type PointerEvent,
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
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ImageUpload } from '@/components/image-upload';
import { Input } from '@/components/ui/input';
import { ItemDisplay } from '@/components/ui/item-display';
import type { MultiSelectGroup } from '@/components/ui/multi-select-command';
import { MultiSelectGallery } from '@/components/ui/multi-select-gallery';
import { generateClothingName } from '@/lib/generate-clothing-name';
import { uploadImageFile } from '@/lib/image-pipeline';
import { imageSrc } from '@/lib/images';
import { cn } from '@/lib/utils';

/** Per-piece placement on the cover canvas — center (0–1) + width fraction. */
interface CoverSpot {
	x: number;
	y: number;
	scale: number;
}

const clamp = (v: number, lo: number, hi: number) =>
	Math.max(lo, Math.min(hi, v));

/** Checkerboard fill to signal a transparent cover background. */
const CHECKER =
	'repeating-conic-gradient(#d4d4d4 0% 25%, #ffffff 0% 50%) 50% / 16px 16px';

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = src;
	});
}

import type { OutfitWithItems } from '../_data/fetchers';
import {
	useAddOutfitItem,
	useCreateOutfit,
	useEditOutfit,
	useRemoveOutfitItem,
} from '../_data/mutations';

interface OutfitEditorDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Omit for "create"; pass to edit an existing template. */
	outfit?: OutfitWithItems;
	wardrobe: Clothing[];
}

/** Compose or refine a reusable outfit template — cover, name, and its pieces. */
export function OutfitEditorDialog({
	open,
	onOpenChange,
	outfit,
	wardrobe,
}: OutfitEditorDialogProps) {
	const isEdit = Boolean(outfit);
	const createOutfit = useCreateOutfit();
	const editOutfit = useEditOutfit();
	const addOutfitItem = useAddOutfitItem();
	const removeOutfitItem = useRemoveOutfitItem();
	// `saving` spans the whole save flow (auto-compose + the writes) so the form
	// stays disabled across the async cover composition too, not just the mutation.
	const [saving, setSaving] = useState(false);
	const pending =
		saving ||
		createOutfit.isPending ||
		editOutfit.isPending ||
		addOutfitItem.isPending ||
		removeOutfitItem.isPending;

	const [name, setName] = useState('');
	const [imageKey, setImageKey] = useState<string | null>(null);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	// Seed the form whenever the dialog opens (or its target outfit changes).
	useEffect(() => {
		if (!open) return;
		setName(outfit?.name ?? '');
		setImageKey(outfit?.imageKey ?? null);
		setSelectedIds(outfit?.items.map((item) => item.clothingId) ?? []);
	}, [open, outfit]);

	const byId = useMemo(
		() => new Map(wardrobe.map((piece) => [piece.id, piece])),
		[wardrobe],
	);

	const groups = useMemo<MultiSelectGroup<Clothing>[]>(() => {
		const buckets = new Map<string, Clothing[]>();
		for (const piece of wardrobe) {
			const list = buckets.get(piece.typeName) ?? [];
			list.push(piece);
			buckets.set(piece.typeName, list);
		}
		return [...buckets.entries()]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([heading, items]) => ({ heading, items }));
	}, [wardrobe]);

	const selectedPieces = selectedIds
		.map((id) => byId.get(id))
		.filter((piece): piece is Clothing => Boolean(piece));

	// --- Cover composer: arrange the chosen pieces' photos into a cover image. ---
	const composablePieces = selectedPieces.filter((p) => p.imageKey);
	const composerRef = useRef<HTMLDivElement>(null);
	const dragRef = useRef<{
		id: string;
		mode: 'move' | 'resize';
		sx: number;
		sy: number;
		spot: CoverSpot;
		side: number;
	} | null>(null);
	const [spots, setSpots] = useState<Record<string, CoverSpot>>({});
	const [order, setOrder] = useState<string[]>([]);
	const [coverBg, setCoverBg] = useState<string>('transparent');
	const [composing, setComposing] = useState(false);

	// Seed a starting spot (grid) for each chosen piece, keeping any the user has
	// moved and dropping ones no longer selected.
	useEffect(() => {
		const ids = selectedPieces.filter((p) => p.imageKey).map((p) => p.id);
		setOrder((prev) => {
			const kept = prev.filter((id) => ids.includes(id));
			return [...kept, ...ids.filter((id) => !kept.includes(id))];
		});
		setSpots((prev) => {
			const cols = Math.max(1, Math.ceil(Math.sqrt(ids.length)));
			const rows = Math.max(1, Math.ceil(ids.length / cols));
			const scale = Math.min(0.5, 0.92 / cols);
			const next: Record<string, CoverSpot> = {};
			ids.forEach((id, i) => {
				next[id] = prev[id] ?? {
					x: ((i % cols) + 0.5) / cols,
					y: (Math.floor(i / cols) + 0.5) / rows,
					scale,
				};
			});
			return next;
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedIds, wardrobe]);

	function bringFront(id: string) {
		setOrder((prev) => [...prev.filter((x) => x !== id), id]);
	}

	function startSpotDrag(
		e: PointerEvent<HTMLElement>,
		id: string,
		mode: 'move' | 'resize',
	) {
		e.stopPropagation();
		const side = composerRef.current?.getBoundingClientRect().width ?? 1;
		const spot = spots[id];
		if (!spot) return;
		if (mode === 'move') bringFront(id);
		dragRef.current = { id, mode, sx: e.clientX, sy: e.clientY, spot, side };
		e.currentTarget.setPointerCapture(e.pointerId);
	}

	function onSpotMove(e: PointerEvent<HTMLElement>) {
		const d = dragRef.current;
		if (!d) return;
		const dx = (e.clientX - d.sx) / d.side;
		const dy = (e.clientY - d.sy) / d.side;
		setSpots((prev) => {
			const cur = prev[d.id];
			if (!cur) return prev;
			if (d.mode === 'move') {
				return {
					...prev,
					[d.id]: {
						...cur,
						x: clamp(d.spot.x + dx, 0, 1),
						y: clamp(d.spot.y + dy, 0, 1),
					},
				};
			}
			return {
				...prev,
				[d.id]: { ...cur, scale: clamp(d.spot.scale + (dx + dy), 0.1, 1.4) },
			};
		});
	}

	function onSpotUp(e: PointerEvent<HTMLElement>) {
		dragRef.current = null;
		try {
			e.currentTarget.releasePointerCapture(e.pointerId);
		} catch {
			/* already released */
		}
	}

	/** Render the arrangement (optional background + pieces) to a webp File. */
	async function composeCover(): Promise<File | null> {
		const ids = order.filter((id) => byId.get(id)?.imageKey && spots[id]);
		if (ids.length === 0) return null;
		const S = 1024;
		const canvas = document.createElement('canvas');
		canvas.width = S;
		canvas.height = S;
		const ctx = canvas.getContext('2d');
		if (!ctx) return null;
		if (coverBg !== 'transparent') {
			ctx.fillStyle = coverBg;
			ctx.fillRect(0, 0, S, S);
		}
		for (const id of ids) {
			const piece = byId.get(id)!;
			const spot = spots[id]!;
			const img = await loadImage(imageSrc(piece.imageKey!));
			const side = spot.scale * S;
			ctx.drawImage(img, spot.x * S - side / 2, spot.y * S - side / 2, side, side);
		}
		const blob = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob(resolve, 'image/webp', 0.92),
		);
		return blob ? new File([blob], 'cover.webp', { type: 'image/webp' }) : null;
	}

	function useArrangementAsCover() {
		setComposing(true);
		(async () => {
			try {
				const composed = await composeCover();
				if (!composed) {
					toast.error('Add pieces with photos to compose a cover');
					return;
				}
				setImageKey(await uploadImageFile(composed));
				toast.success('Cover updated');
			} catch {
				toast.error('Could not compose the cover');
			} finally {
				setComposing(false);
			}
		})();
	}

	function close() {
		if (pending) return;
		onOpenChange(false);
	}

	async function save() {
		const trimmed = name.trim();
		if (!trimmed) {
			toast.error('Name your outfit');
			return;
		}
		if (selectedIds.length === 0) {
			toast.error('Add at least one piece');
			return;
		}

		setSaving(true);
		try {
			// No cover set yet but the pieces have photos → auto-compose one.
			let cover = imageKey ?? undefined;
			if (!cover && composablePieces.length > 0) {
				try {
					const composed = await composeCover();
					if (composed) cover = await uploadImageFile(composed);
				} catch {
					/* fall through with no cover */
				}
			}

			if (!outfit) {
				await createOutfit.mutateAsync({
					name: trimmed,
					imageKey: cover,
					clothingIds: selectedIds,
				});
				onOpenChange(false);
				return;
			}

			// Edit: sync the name/cover and reconcile the piece set.
			const current = new Set(outfit.items.map((item) => item.clothingId));
			const next = new Set(selectedIds);
			await editOutfit.mutateAsync({
				id: outfit.id,
				input: { name: trimmed, imageKey: cover ?? null },
			});
			await Promise.all([
				...selectedIds
					.filter((id) => !current.has(id))
					.map((id) =>
						addOutfitItem.mutateAsync({ id: outfit.id, input: { clothingId: id } }),
					),
				...[...current]
					.filter((id) => !next.has(id))
					.map((id) =>
						removeOutfitItem.mutateAsync({ id: outfit.id, clothingId: id }),
					),
			]);
			onOpenChange(false);
		} catch {
			/* onError toast already shown */
		} finally {
			setSaving(false);
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => (next ? onOpenChange(true) : close())}
		>
			<DialogContent className="flex max-h-[90vh] flex-col gap-4 overflow-hidden sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle>{isEdit ? 'Edit outfit' : 'New outfit'}</DialogTitle>
					<DialogDescription>
						Group pieces into a reusable template you can drop onto any trip
						day.
					</DialogDescription>
				</DialogHeader>

				<div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden sm:flex-row">
					<div className="flex shrink-0 flex-col gap-4 overflow-y-auto sm:w-72">
						<div className="space-y-1.5">
							<label htmlFor="outfit-name" className="text-sm font-medium">
								Name
							</label>
							<Input
								id="outfit-name"
								value={name}
								autoFocus
								placeholder="e.g. Rainy day commute"
								disabled={pending}
								onChange={(event) => setName(event.target.value)}
							/>
						</div>

						<div className="space-y-2">
							<span className="text-sm font-medium">Cover</span>
							{composablePieces.length === 0 ? (
								<>
									<p className="text-muted-foreground text-xs">
										Add pieces with photos to compose a cover from them, or
										upload one.
									</p>
									<ImageUpload value={imageKey} onChange={setImageKey} />
								</>
							) : (
								<>
									<div className="flex items-center gap-2 text-xs text-muted-foreground">
										Background
										<button
											type="button"
											title="Transparent"
											onClick={() => setCoverBg('transparent')}
											style={{ background: CHECKER }}
											className={cn(
												'size-6 rounded border border-border',
												coverBg === 'transparent' && 'ring-2 ring-ring',
											)}
										/>
										<button
											type="button"
											title="White"
											onClick={() => setCoverBg('#ffffff')}
											className={cn(
												'size-6 rounded border border-border bg-white',
												coverBg === '#ffffff' && 'ring-2 ring-ring',
											)}
										/>
										<label
											title="Custom color"
											className="relative size-6 overflow-hidden rounded border border-border"
										>
											<span
												className="block size-full"
												style={{
													background:
														coverBg === 'transparent' || coverBg === '#ffffff'
															? 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)'
															: coverBg,
												}}
											/>
											<input
												type="color"
												value={coverBg.startsWith('#') ? coverBg : '#888888'}
												onChange={(e) => setCoverBg(e.target.value)}
												className="absolute inset-0 cursor-pointer opacity-0"
											/>
										</label>
									</div>

									<div
										ref={composerRef}
										style={{
											background: coverBg === 'transparent' ? CHECKER : coverBg,
										}}
										className="relative mx-auto aspect-square w-full max-w-xs touch-none overflow-hidden rounded-lg border border-border"
									>
										{order.map((id) => {
											const piece = byId.get(id);
											const spot = spots[id];
											if (!piece?.imageKey || !spot) return null;
											return (
												<div
													key={id}
													onPointerDown={(e) => startSpotDrag(e, id, 'move')}
													onPointerMove={onSpotMove}
													onPointerUp={onSpotUp}
													onPointerLeave={onSpotUp}
													style={{
														left: `${(spot.x - spot.scale / 2) * 100}%`,
														top: `${(spot.y - spot.scale / 2) * 100}%`,
														width: `${spot.scale * 100}%`,
														height: `${spot.scale * 100}%`,
													}}
													className="group/spot absolute cursor-grab touch-none active:cursor-grabbing"
												>
													{/* eslint-disable-next-line @next/next/no-img-element */}
													<img
														src={imageSrc(piece.imageKey)}
														alt=""
														draggable={false}
														className="pointer-events-none size-full object-contain select-none"
													/>
													<span
														onPointerDown={(e) => startSpotDrag(e, id, 'resize')}
														onPointerMove={onSpotMove}
														onPointerUp={onSpotUp}
														className="absolute right-0 bottom-0 size-3.5 translate-x-1/3 translate-y-1/3 cursor-nwse-resize touch-none rounded-full border-2 border-white bg-foreground/70 opacity-0 group-hover/spot:opacity-100"
													/>
												</div>
											);
										})}
									</div>

									<Button
										type="button"
										variant="outline"
										size="sm"
										loading={composing}
										onClick={useArrangementAsCover}
										className="w-full"
									>
										<ImageDown /> Use this arrangement as cover
									</Button>
									<p className="text-muted-foreground text-[0.7rem]">
										Drag to arrange, drag a corner to resize. Transparent cutouts
										layer cleanly; pick a background above if you want one.
									</p>
								</>
							)}
						</div>

						<div className="space-y-1.5">
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium">Pieces</span>
								<span className="text-muted-foreground text-xs">
									{selectedPieces.length} selected
								</span>
							</div>

							{selectedPieces.length === 0 ? (
								<EmptyState
									icon={<Shirt />}
									title="No pieces yet"
									description="Pick from your wardrobe to build this look."
									className="py-6"
								/>
							) : (
								<ul className="flex flex-wrap gap-1.5">
									{selectedPieces.map((piece) => (
										<li
											key={piece.id}
											className="bg-card ring-foreground/10 flex items-center gap-1.5 rounded-lg py-1 pr-1 pl-1.5 ring-1"
										>
											<ItemDisplay
												name={generateClothingName(piece)}
												imageKey={piece.imageKey}
												size="chip"
											/>
											<Button
												type="button"
												variant="ghost"
												size="icon-xs"
												aria-label={`Remove ${generateClothingName(piece)}`}
												disabled={pending}
												onClick={() =>
													setSelectedIds((ids) =>
														ids.filter((id) => id !== piece.id),
													)
												}
											>
												<X />
											</Button>
										</li>
									))}
								</ul>
							)}
						</div>
					</div>

					<div className="flex min-h-0 flex-1 flex-col">
						{wardrobe.length === 0 ? (
							<p className="text-muted-foreground px-3 py-6 text-center text-sm">
								Your wardrobe is empty. Add clothing first.
							</p>
						) : (
							<MultiSelectGallery<Clothing>
								groups={groups}
								getKey={(piece) => piece.id}
								getLabel={generateClothingName}
								getImageKey={(piece) => piece.imageKey}
								value={selectedIds}
								onValueChange={setSelectedIds}
								placeholder="Search your wardrobe…"
								className="flex-1"
								fallbackIcon={<Shirt />}
							/>
						)}
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" disabled={pending} onClick={close}>
						Cancel
					</Button>
					<Button variant="brand" loading={pending} onClick={save}>
						{!isEdit && <Plus />}
						{isEdit ? 'Save changes' : 'Create outfit'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
