'use client';

import {
	CalendarPlus,
	GripVertical,
	Minus,
	Plus,
	Search,
	Shirt,
	X,
} from 'lucide-react';
import { CoatHanger } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { DragSource } from '@/components/dnd';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ItemDisplay } from '@/components/ui/item-display';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Clothing } from '@/generated/prisma/client';
import type { OutfitWithItems } from '@/app/dashboard/(main)/outfits/_data/fetchers';
import { generateClothingName } from '@/lib/generate-clothing-name';
import { imageSrc } from '@/lib/images';
import type { Zone } from '@/lib/dnd/zone';
import { effectiveBringing, remaining, type BringMap } from '@/lib/reuse';
import { cn } from '@/lib/utils';

import { setClothingBringing } from '../_data/api';
import { useAddClothingToDays } from '../_data/mutations';
import { clothingBoardKeys } from '../_data/queries';

type ClosetClothing = Clothing & { type: { name: string; category: string } };

/**
 * The wardrobe side-panel, docked as a fixed sidebar column (no overlay/blur).
 * A search box over a draggable catalog — drag a piece straight onto a day,
 * outfit, or the Universal/Backup lanes. Each piece shows how many of the owned
 * units are still free to place ("N left" / "used") given the per-trip bringing
 * count, with an inline stepper to change how many come along.
 */
export function ClosetSidebar({
	tripId,
	clothing,
	outfits,
	placed,
	bringOverrides,
	onClose,
}: {
	tripId: string;
	clothing: ClosetClothing[];
	/** The user's reusable outfit templates, draggable onto a day. */
	outfits: OutfitWithItems[];
	/** Provision count per clothing id this trip (drives "N left"). */
	placed: Map<string, number>;
	/** Per-trip bringing overrides; absent → owned quantity. */
	bringOverrides: BringMap;
	onClose: () => void;
}) {
	const closetZone: Zone = { kind: 'closet', ownerId: tripId };

	return (
		<aside
			data-testid="closet-panel"
			className="bg-panel text-panel-foreground border-border flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border shadow-sm"
		>
			<div className="border-border flex items-center gap-2 border-b px-3 py-2.5">
				<Shirt className="size-4" />
				<span className="text-sm font-semibold">Closet</span>
				<Button
					variant="ghost"
					size="icon-sm"
					className="ml-auto"
					onClick={onClose}
					aria-label="Hide closet"
				>
					<X />
				</Button>
			</div>

			<Tabs
				defaultValue="clothes"
				className="min-h-0 flex-1 gap-0 overflow-hidden"
			>
				<div className="border-border border-b p-3 pb-2.5">
					<TabsList className="w-full">
						<TabsTrigger value="clothes">
							<Shirt />
							Clothes
						</TabsTrigger>
						<TabsTrigger value="outfits">
							<CoatHanger />
							Outfits
						</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent
					value="clothes"
					className="flex min-h-0 flex-1 flex-col overflow-hidden"
				>
					<ClothesTab
						tripId={tripId}
						clothing={clothing}
						zone={closetZone}
						placed={placed}
						bringOverrides={bringOverrides}
					/>
				</TabsContent>

				<TabsContent
					value="outfits"
					className="flex min-h-0 flex-1 flex-col overflow-hidden"
				>
					<OutfitsTab outfits={outfits} zone={closetZone} />
				</TabsContent>
			</Tabs>
		</aside>
	);
}

/** Searchable, draggable clothing catalog (grouped by type). */
function ClothesTab({
	tripId,
	clothing,
	zone,
	placed,
	bringOverrides,
}: {
	tripId: string;
	clothing: ClosetClothing[];
	zone: Zone;
	placed: Map<string, number>;
	bringOverrides: BringMap;
}) {
	const [query, setQuery] = useState('');

	const groups = useMemo(() => {
		const q = query.trim().toLowerCase();
		const byType = new Map<string, ClosetClothing[]>();
		for (const item of clothing) {
			if (q && !generateClothingName(item).toLowerCase().includes(q)) continue;
			const list = byType.get(item.typeName) ?? [];
			list.push(item);
			byType.set(item.typeName, list);
		}
		return [...byType.entries()]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([heading, items]) => ({ heading, items }));
	}, [clothing, query]);

	if (clothing.length === 0) {
		return (
			<div className="p-4">
				<EmptyState
					icon={<Shirt />}
					title="Your wardrobe is empty"
					description="Add clothing in your wardrobe, then drag it onto a day."
				/>
			</div>
		);
	}

	return (
		<>
			<div className="border-border border-b p-3">
				<div className="relative">
					<Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
					<input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search your wardrobe…"
						aria-label="Search your wardrobe"
						className="bg-card border-border focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-lg border pr-2.5 pl-9 text-sm outline-none focus-visible:ring-3"
					/>
				</div>
			</div>

			<ScrollArea className="min-h-0 flex-1">
				<div className="flex flex-col gap-4 p-3">
					{groups.length === 0 ? (
						<p className="text-muted-foreground px-1 py-8 text-center text-sm">
							No matches.
						</p>
					) : (
						groups.map((group) => (
							<div key={group.heading} className="flex flex-col gap-1.5">
								<p className="text-muted-foreground px-0.5 text-xs font-semibold tracking-wide uppercase">
									{group.heading}
								</p>
								<div className="flex flex-col gap-1">
									{group.items.map((item) => (
										<ClosetPiece
											key={item.id}
											tripId={tripId}
											item={item}
											zone={zone}
											placedCount={placed.get(item.id) ?? 0}
											bringing={effectiveBringing(
												bringOverrides,
												item.id,
												item.quantity,
											)}
										/>
									))}
								</div>
							</div>
						))
					)}
				</div>
			</ScrollArea>
		</>
	);
}

/** The user's outfit templates, each draggable onto a day to materialize it. */
function OutfitsTab({
	outfits,
	zone,
}: {
	outfits: OutfitWithItems[];
	zone: Zone;
}) {
	if (outfits.length === 0) {
		return (
			<div className="p-4">
				<EmptyState
					icon={<CoatHanger />}
					title="No outfits yet"
					description="Build outfit templates, then drag one onto a day."
				/>
			</div>
		);
	}

	return (
		<ScrollArea className="min-h-0 flex-1">
			<div className="flex flex-col gap-1.5 p-3">
				{outfits.map((outfit) => (
					<ClosetOutfit key={outfit.id} outfit={outfit} zone={zone} />
				))}
			</div>
		</ScrollArea>
	);
}

/** A draggable outfit-template chip — a cover thumbnail + name + piece count. */
function ClosetOutfit({
	outfit,
	zone,
}: {
	outfit: OutfitWithItems;
	zone: Zone;
}) {
	const cover =
		outfit.imageKey ??
		outfit.items.find((item) => item.clothing.imageKey)?.clothing.imageKey ??
		null;
	const count = outfit.items.length;

	return (
		<DragSource id={outfit.id} type="outfit" zone={zone}>
			{({ ref, handleRef, isDragging }) => (
				<div
					ref={(node) => {
						ref(node);
						handleRef(node);
					}}
					data-testid="closet-outfit"
					data-name={outfit.name}
					aria-label={`Drag ${outfit.name} onto a day`}
					className={cn(
						'group/outfit bg-card ring-foreground/10 hover-hover:hover:ring-foreground/20 flex cursor-grab touch-none items-center gap-2 rounded-lg p-1.5 ring-1 transition-[box-shadow,opacity] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:cursor-grabbing',
						isDragging && 'opacity-50',
					)}
				>
					<GripVertical className="text-muted-foreground/40 group-hover/outfit:text-muted-foreground -ml-0.5 size-4 shrink-0 transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)]" />
					<div className="bg-muted text-muted-foreground relative size-10 shrink-0 overflow-hidden rounded-lg">
						{cover ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img
								src={imageSrc(cover)}
								alt=""
								loading="lazy"
								className="size-full object-cover"
							/>
						) : (
							<CoatHanger className="absolute inset-0 m-auto size-1/2 opacity-40" />
						)}
					</div>
					<div className="flex min-w-0 flex-1 flex-col">
						<span className="truncate text-sm font-medium">{outfit.name}</span>
						<span className="text-muted-foreground text-xs">
							{count} piece{count === 1 ? '' : 's'}
						</span>
					</div>
				</div>
			)}
		</DragSource>
	);
}

function ClosetPiece({
	tripId,
	item,
	zone,
	placedCount,
	bringing,
}: {
	tripId: string;
	item: ClosetClothing;
	zone: Zone;
	placedCount: number;
	bringing: number;
}) {
	const name = generateClothingName(item);
	const queryClient = useQueryClient();
	const addToDays = useAddClothingToDays(tripId);
	// Instant local bringing so the stepper AND the "left" badge update together on
	// +/- without waiting for the round-trip. Server writes are debounced to the final
	// value AND serialized through one promise chain: rapid clicks would otherwise
	// fire overlapping requests that race (an older write completing last would
	// drop a click), so we coalesce into one in-order upsert.
	const [value, setValue] = useState(bringing);
	const [, startTransition] = useTransition();
	const dirtyRef = useRef(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const chainRef = useRef<Promise<unknown>>(Promise.resolve());
	// Re-sync from the server only when there's no local edit in flight.
	useEffect(() => {
		if (!dirtyRef.current) setValue(bringing);
	}, [bringing]);

	function step(delta: number) {
		setValue((current) => {
			const clamped = Math.max(0, Math.min(999, current + delta));
			if (clamped === current) return current;
			dirtyRef.current = true;
			if (timerRef.current) clearTimeout(timerRef.current);
			timerRef.current = setTimeout(() => {
				startTransition(async () => {
					chainRef.current = chainRef.current
						.catch(() => {})
						.then(() =>
							setClothingBringing(tripId, {
								clothingId: item.id,
								bringing: clamped,
							}),
						);
					await chainRef.current;
					dirtyRef.current = false;
					// Reconcile the board-derived "N left" with the persisted bringing.
					await queryClient.invalidateQueries({
						queryKey: clothingBoardKeys.board(tripId),
					});
				});
			}, 250);
			return clamped;
		});
	}

	async function spreadAcrossDays() {
		try {
			const res = await addToDays.mutateAsync(item.id);
			toast.success(res.message);
		} catch {
			// The hook's onError already toasts the failure.
		}
	}

	const left = remaining(placedCount, value);
	const fullyUsed = left === 0;
	// Single-quantity pieces are implicitly "bring 1": the per-trip stepper and the
	// "N left" capacity badge are noise for them (they're either placed or not), so
	// those only surface for multi-quantity items that actually need allocating.
	const multiQty = item.quantity > 1;

	return (
		<div
			className="flex flex-col gap-1"
			data-testid="closet-entry"
			data-name={name}
		>
			<DragSource id={item.id} type="clothing" zone={zone}>
				{({ ref, handleRef, isDragging }) => (
					// The whole chip is the drag handle (matches the board's piece cards),
					// so it's discoverable and grabbable anywhere — not just the grip.
					// A fully-used piece is dimmed but STILL draggable: over-allocating
					// past the bringing count simply counts as reuse.
					<div
						ref={(node) => {
							ref(node);
							handleRef(node);
						}}
						data-testid="closet-piece"
						data-name={name}
						data-used={fullyUsed || undefined}
						aria-label={`Drag ${name} onto the board`}
						className={cn(
							'group/closet bg-card ring-foreground/10 hover-hover:hover:ring-foreground/20 flex cursor-grab touch-none items-center gap-1 rounded-lg p-1.5 ring-1 transition-[box-shadow,opacity] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:cursor-grabbing',
							isDragging && 'opacity-50',
							fullyUsed && 'opacity-60',
						)}
					>
						<GripVertical className="text-muted-foreground/40 group-hover/closet:text-muted-foreground -ml-0.5 size-4 shrink-0 transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)]" />
						<ItemDisplay
							name={name}
							imageKey={item.imageKey}
							size="chip"
							className="min-w-0 flex-1"
						/>
						<Button
							size="icon-xs"
							variant="ghost"
							className="shrink-0"
							disabled={addToDays.isPending}
							onPointerDown={(e) => e.stopPropagation()}
							onClick={spreadAcrossDays}
							title="Add to every day"
							aria-label={`Add ${name} to every day`}
						>
							<CalendarPlus />
						</Button>
						{multiQty && (
							<span
								data-testid="closet-left"
								className={cn(
									'mr-1 shrink-0 rounded-full px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums',
									fullyUsed
										? 'bg-muted text-muted-foreground'
										: 'bg-brand-subtle text-brand',
								)}
								title={
									fullyUsed
										? 'All units placed'
										: `${left} of ${value} still to place`
								}
							>
								{fullyUsed ? 'used' : `${left} left`}
							</span>
						)}
					</div>
				)}
			</DragSource>
			{multiQty && (
				<BringStepper
					name={name}
					value={value}
					owned={item.quantity}
					onStep={step}
				/>
			)}
		</div>
	);
}

/** Inline +/- control for the per-trip "bringing" count (presentational). */
function BringStepper({
	name,
	value,
	owned,
	onStep,
}: {
	name: string;
	value: number;
	owned: number;
	onStep: (delta: number) => void;
}) {
	return (
		<div
			className="text-muted-foreground flex items-center gap-1.5 pl-1 text-[0.7rem]"
			data-testid="bring-stepper"
		>
			<span className="shrink-0">Bringing</span>
			<div className="ml-auto flex items-center gap-1">
				<Button
					size="icon-xs"
					variant="ghost"
					disabled={value <= 0}
					onClick={() => onStep(-1)}
					aria-label={`Bring one fewer ${name}`}
				>
					<Minus />
				</Button>
				<span
					data-testid="bring-value"
					className="text-foreground w-8 text-center text-xs font-semibold tabular-nums"
				>
					{value}
				</span>
				<Button
					size="icon-xs"
					variant="ghost"
					disabled={value >= 999}
					onClick={() => onStep(1)}
					aria-label={`Bring one more ${name}`}
				>
					<Plus />
				</Button>
				<span className="text-muted-foreground/70 ml-0.5 shrink-0 tabular-nums">
					/ {owned}
				</span>
			</div>
		</div>
	);
}
