'use client';

import { TShirt } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import {
	Backpack,
	GripVertical,
	Inbox,
	Luggage,
	Package,
	Trash2,
} from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

import { DragAnnouncer, DragBoard, DropZone, Sortable } from '@/components/dnd';
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
import { EmptyState } from '@/components/ui/empty-state';
import { ItemDisplay } from '@/components/ui/item-display';
import { Progress } from '@/components/ui/progress';
import { ContainerType } from '@/generated/prisma/enums';
import { rankForNeighbors, sortByRank } from '@/lib/dnd/lexorank';
import { useDragBoard, type SortableDrop } from '@/lib/dnd/use-drag-board';
import { encodeZone, type ItemType, type Zone } from '@/lib/dnd/zone';
import { generateClothingName } from '@/lib/generate-clothing-name';
import { cn } from '@/lib/utils';

import { resolveEssentialItem } from '../../_data/essential-item';

import {
	changeClothingProvisionContainerOrder,
	changeContainerProvisionTripOrder,
	changeEssentialProvisionContainerOrder,
	deleteClothingProvisionFromContainer,
	deleteEssentialProvisionFromContainer,
	moveClothingProvisionToContainer,
	moveEssentialProvisionToContainer,
	setClothingProvisionContainerless,
	setEssentialProvisionContainerless,
} from './_data/api';
import { useDeleteContainerProvision } from './_data/mutations';
import { containerBoardKeys } from './_data/queries';
import { ProvisionTile, type BoardItem } from './_components/provision-tile';
import type { ContainersBoard } from './_data/fetchers';

type ItemKind = Extract<ItemType, 'clothing' | 'essential'>;

/** The flat, board-local shape every provision is normalized into. */
interface FlatItem extends BoardItem {
	type: ItemKind;
	/** The clothing id (for pool dedupe); null for essentials. */
	clothingId: string | null;
	/** Owning containerProvision id, or null while loose (pool / containerless). */
	containerProvisionId: string | null;
	containerOrder: string | null;
	/** A loose item marked to be packed directly into a suitcase (no container). */
	containerless: boolean;
}

/** A container card, reorderable within the trip's containers board. */
interface CardItem {
	id: string;
	type: 'container';
	tripOrder: string | null;
}

type BoardEntry = FlatItem | CardItem;

const POOL_ZONE: Zone = { kind: 'closet', ownerId: '__pool__' };
const POOL_KEY = encodeZone(POOL_ZONE);
// The pool and the containerless card hold clothing AND essentials together, so
// their tiles must accept BOTH types as reorder neighbors — otherwise a clothing
// tile rejects an essential source (and vice-versa) and you can't drag one past the
// other. Real containers stay single-type (a tile defaults to accepting its own kind).
const MIXED_ACCEPT: ItemKind[] = ['clothing', 'essential'];
const containerlessZone = (tripId: string): Zone => ({
	kind: 'containerless',
	ownerId: tripId,
});
const cardsZone = (tripId: string): Zone => ({
	kind: 'containerCards',
	ownerId: tripId,
});
const containerZone = (containerProvisionId: string): Zone => ({
	kind: 'container',
	ownerId: containerProvisionId,
});

function flatten(board: ContainersBoard): FlatItem[] {
	const items: FlatItem[] = [];

	const pushClothing = (
		p: ContainersBoard['clothingProvisions'][number],
		containerProvisionId: string | null,
	) =>
		items.push({
			id: p.id,
			type: 'clothing',
			clothingId: p.clothingId,
			name: generateClothingName(p.clothing),
			imageKey: p.clothing.imageKey,
			containerProvisionId,
			containerOrder: p.containerOrder,
			containerless: p.containerless,
		});

	const pushEssential = (
		p: ContainersBoard['essentialProvisions'][number],
		containerProvisionId: string | null,
	) => {
		const item = resolveEssentialItem(p);
		items.push({
			id: p.id,
			type: 'essential',
			clothingId: null,
			name: item.name,
			imageKey: item.imageKey,
			containerProvisionId,
			containerOrder: p.containerOrder,
			containerless: p.containerless,
		});
	};

	for (const p of board.clothingProvisions) pushClothing(p, null);
	for (const p of board.essentialProvisions) pushEssential(p, null);
	for (const cp of board.containerProvisions) {
		for (const p of cp.clothingProvisions) pushClothing(p, cp.id);
		for (const p of cp.essentialProvisions) pushEssential(p, cp.id);
	}

	return items;
}

/**
 * Collapse identical clothing into one representative + a ×count, preserving order.
 * Essentials are never reused — one rep each, count 1. Matches the pool's stacking so
 * a clothing item reads the same ×N inside a container as in the Unassigned pool.
 */
function stack(items: FlatItem[]): {
	reps: FlatItem[];
	countById: Map<string, number>;
} {
	const reps: FlatItem[] = [];
	const countById = new Map<string, number>();
	const repByClothing = new Map<string, FlatItem>();
	for (const it of items) {
		if (it.type === 'clothing' && it.clothingId) {
			const rep = repByClothing.get(it.clothingId);
			if (rep) countById.set(rep.id, (countById.get(rep.id) ?? 1) + 1);
			else {
				repByClothing.set(it.clothingId, it);
				reps.push(it);
				countById.set(it.id, 1);
			}
		} else {
			reps.push(it);
			countById.set(it.id, 1);
		}
	}
	return { reps, countById };
}

/** Per-clothing effective bringing for the trip (override else owned quantity). */
function bringingMap(board: ContainersBoard): Map<string, number> {
	const map = new Map<string, number>();
	for (const p of board.clothingProvisions)
		map.set(p.clothingId, p.clothing.quantity);
	for (const cp of board.containerProvisions)
		for (const p of cp.clothingProvisions)
			map.set(p.clothingId, p.clothing.quantity);
	for (const b of board.clothingBrings) map.set(b.clothingId, b.bringing);
	return map;
}

/** Build every controlled group: pool, containerless, each container, and the cards. */
function buildBoard(
	board: ContainersBoard,
	tripId: string,
): { groups: Record<string, BoardEntry[]>; countById: Map<string, number> } {
	const flat = flatten(board);
	const loose = flat.filter((it) => !it.containerProvisionId);
	const countById = new Map<string, number>();
	const groups: Record<string, BoardEntry[]> = {};

	// Pool: loose items NOT marked containerless. Clothing capped so pool + everything
	// already assigned (containers + containerless) never exceeds the bring count.
	const bring = bringingMap(board);
	const consumed = new Map<string, number>();
	for (const it of flat)
		if (
			it.type === 'clothing' &&
			it.clothingId &&
			(it.containerProvisionId || it.containerless)
		)
			consumed.set(it.clothingId, (consumed.get(it.clothingId) ?? 0) + 1);

	const poolItems = loose.filter((it) => !it.containerless);
	const pool = stack(poolItems);
	const poolReps: FlatItem[] = [];
	for (const rep of pool.reps) {
		if (rep.type === 'clothing' && rep.clothingId) {
			const owned =
				bring.get(rep.clothingId) ?? pool.countById.get(rep.id) ?? 1;
			const cap = Math.max(0, owned - (consumed.get(rep.clothingId) ?? 0));
			const count = Math.min(pool.countById.get(rep.id) ?? 1, cap);
			if (count === 0) continue;
			poolReps.push(rep);
			countById.set(rep.id, count);
		} else {
			poolReps.push(rep);
			countById.set(rep.id, 1);
		}
	}
	groups[POOL_KEY] = poolReps;

	// Containerless: loose items marked direct-to-luggage (stacked, no cap).
	const cl = stack(loose.filter((it) => it.containerless));
	groups[encodeZone(containerlessZone(tripId))] = cl.reps;
	for (const [id, n] of cl.countById) countById.set(id, n);

	// Each container: its items, ordered by containerOrder, then stacked.
	for (const cp of board.containerProvisions) {
		const inside = sortByRank(
			flat.filter((it) => it.containerProvisionId === cp.id),
			(it) => it.containerOrder ?? '',
		);
		const s = stack(inside);
		groups[encodeZone(containerZone(cp.id))] = s.reps;
		for (const [id, n] of s.countById) countById.set(id, n);
	}

	// The reorderable container cards themselves.
	groups[encodeZone(cardsZone(tripId))] = board.containerProvisions.map(
		(cp) => ({
			id: cp.id,
			type: 'container' as const,
			tripOrder: cp.tripOrder,
		}),
	);

	return { groups, countById };
}

export function ContainerBoard({
	tripId,
	board,
}: {
	tripId: string;
	board: ContainersBoard;
}) {
	const queryClient = useQueryClient();
	const invalidateBoard = React.useCallback(
		() =>
			queryClient.invalidateQueries({
				queryKey: containerBoardKeys.board(tripId),
			}),
		[queryClient, tripId],
	);

	// Persist a write, then re-sync from the server (the refetch reverts a rejected
	// move and reconciles the optimistic order). `invalidate` runs whether the call
	// succeeds or fails, so a failure rolls the optimistic UI back to server truth.
	const persist = React.useCallback(
		async (call: () => Promise<unknown>, ok: string, fail: string) => {
			try {
				await call();
				toast.success(ok);
			} catch {
				toast.error(fail);
			} finally {
				await invalidateBoard();
			}
		},
		[invalidateBoard],
	);

	const onSortableDrop = React.useCallback(
		(drop: SortableDrop<BoardEntry>) => {
			const { id, type, fromZone, toZone, destItems, index, sameZone } = drop;

			// Reordering a container card within the trip.
			if (type === 'container') {
				if (!sameZone) return;
				const rank = rankForNeighbors(
					destItems as CardItem[],
					index,
					(c) => c.tripOrder ?? '',
				);
				void persist(
					() => changeContainerProvisionTripOrder(id, rank),
					'Reordered',
					'Could not reorder container',
				);
				return;
			}

			const kind = type as ItemKind;

			// Dropped into the Unassigned pool → fully unassign.
			if (toZone.kind === 'closet') {
				if (fromZone.kind === 'closet') return; // pool reorder isn't persisted
				void persist(
					() =>
						(kind === 'clothing'
							? deleteClothingProvisionFromContainer
							: deleteEssentialProvisionFromContainer)(id),
					'Moved',
					'Could not unpack item',
				);
				return;
			}

			// Dropped into the Containerless card → mark direct-to-luggage.
			if (toZone.kind === 'containerless') {
				if (fromZone.kind === 'containerless') return; // within-card order not kept
				void persist(
					() =>
						(kind === 'clothing'
							? setClothingProvisionContainerless
							: setEssentialProvisionContainerless)(id),
					'Moved to direct-to-luggage',
					'Could not move item',
				);
				return;
			}

			// Dropped into a real container.
			const containerProvisionId = toZone.ownerId;
			const rank = rankForNeighbors(
				destItems as FlatItem[],
				index,
				(it) => it.containerOrder ?? '',
			);
			if (sameZone) {
				void persist(
					() =>
						(kind === 'clothing'
							? changeClothingProvisionContainerOrder
							: changeEssentialProvisionContainerOrder)(id, rank),
					'Reordered',
					'Could not reorder',
				);
			} else {
				void persist(
					() =>
						(kind === 'clothing'
							? moveClothingProvisionToContainer
							: moveEssentialProvisionToContainer)(id, {
							containerProvisionId,
							containerOrder: rank,
						}),
					'Moved',
					'Could not move item',
				);
			}
		},
		[persist],
	);

	const { groups, write, props } = useDragBoard<BoardEntry>({
		groups: () => buildBoard(board, tripId).groups,
		deps: [board],
		onSortableDrop,
	});

	const countById = React.useMemo(
		() => buildBoard(board, tripId).countById,
		[board, tripId],
	);

	const containers = board.containerProvisions;
	const poolReps = (groups[POOL_KEY] ?? []) as FlatItem[];
	const containerlessReps = (groups[encodeZone(containerlessZone(tripId))] ??
		[]) as FlatItem[];
	const cards = (groups[encodeZone(cardsZone(tripId))] ?? []) as CardItem[];

	// Progress in DISTINCT packable units (the ×N stacks the board shows), from server
	// truth so the bar settles on the refetch. An item is "placed" once it's in a
	// container OR marked direct-to-luggage (containerless); the pool is what's left.
	const { total, packed } = React.useMemo(() => {
		const { groups: g, countById: c } = buildBoard(board, tripId);
		const sum = (reps?: BoardEntry[]) =>
			(reps ?? []).reduce((n, r) => n + (c.get(r.id) ?? 1), 0);
		const poolUnits = sum(g[POOL_KEY]);
		const containerlessUnits = sum(g[encodeZone(containerlessZone(tripId))]);
		let containerUnits = 0;
		for (const cp of board.containerProvisions)
			containerUnits += sum(g[encodeZone(containerZone(cp.id))]);
		const placed = containerUnits + containerlessUnits;
		return { total: placed + poolUnits, packed: placed };
	}, [board, tripId]);

	/** Pull a packed/containerless item back out, into the Unassigned pool. */
	const unpack = React.useCallback(
		(item: FlatItem) => {
			write((g) => {
				const next: Record<string, BoardEntry[]> = {};
				for (const [k, arr] of Object.entries(g))
					next[k] = arr.filter((it) => it.id !== item.id);
				return next;
			});
			void persist(
				() =>
					(item.type === 'clothing'
						? deleteClothingProvisionFromContainer
						: deleteEssentialProvisionFromContainer)(item.id),
				'Moved',
				'Could not unpack item',
			);
		},
		[write, persist],
	);

	// Map cards (in their persisted order) back to the full provision for rendering.
	const cpById = React.useMemo(
		() => new Map(containers.map((cp) => [cp.id, cp])),
		[containers],
	);

	return (
		<DragBoard {...props}>
			<DragAnnouncer />
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr] lg:items-start">
				<div className="flex flex-col gap-4 lg:sticky lg:top-24">
					<UnassignedPool reps={poolReps} countById={countById} />
					<ContainerlessCard
						tripId={tripId}
						reps={containerlessReps}
						countById={countById}
						onUnpack={unpack}
					/>
				</div>
				<div className="flex flex-col gap-3">
					<div className="flex items-center justify-between gap-3 px-0.5">
						<p className="text-sm font-medium">
							Containers
							<span className="text-muted-foreground ml-2 tabular-nums">
								{packed}/{total} placed
							</span>
						</p>
						<div className="w-40">
							<Progress value={total ? (packed / total) * 100 : 0} />
						</div>
					</div>
					{containers.length === 0 ? (
						<EmptyState
							icon={<Package />}
							title="No containers on this trip yet"
							description="Add a bag or packing cube to start sorting your provisions into it."
						/>
					) : (
						<DropZone
							zone={cardsZone(tripId)}
							accepts={['container']}
							className="grid grid-cols-1 gap-4 xl:grid-cols-2"
						>
							{cards.map((card, i) => {
								const cp = cpById.get(card.id);
								if (!cp) return null;
								return (
									<Sortable
										key={card.id}
										id={card.id}
										index={i}
										type="container"
										zone={cardsZone(tripId)}
										accept={['container']}
									>
										{({ ref, handleRef, isDragging }) => (
											<ContainerCard
												dragRef={ref}
												handleRef={handleRef}
												isDragging={isDragging}
												tripId={tripId}
												name={cp.container.name}
												imageKey={cp.container.imageKey}
												type={cp.container.type}
												containerProvisionId={cp.id}
												items={
													(groups[encodeZone(containerZone(cp.id))] ??
														[]) as FlatItem[]
												}
												countById={countById}
												onUnpack={unpack}
											/>
										)}
									</Sortable>
								);
							})}
						</DropZone>
					)}
				</div>
			</div>
		</DragBoard>
	);
}

/** A single packable tile with an optional ×N stack badge (shared by every zone). */
function StackedTile({
	item,
	index,
	zone,
	count,
	accept,
	onRemove,
	tileTestId = 'provision-tile',
	countTestId = 'stack-count',
}: {
	item: FlatItem;
	index: number;
	zone: Zone;
	count: number;
	/** Reorder-neighbor types — mixed zones (pool / containerless) pass both. */
	accept?: ItemKind[];
	onRemove?: () => void;
	tileTestId?: string;
	countTestId?: string;
}) {
	return (
		<div className="relative" data-testid={tileTestId} data-name={item.name}>
			<ProvisionTile
				item={item}
				index={index}
				zone={zone}
				accept={accept}
				onRemove={onRemove}
			/>
			{count > 1 && (
				<span
					data-testid={countTestId}
					className="bg-brand text-brand-foreground pointer-events-none absolute top-1 right-1 z-10 rounded-full px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums shadow-sm"
					title={`${count} units`}
				>
					×{count}
				</span>
			)}
		</div>
	);
}

function UnassignedPool({
	reps,
	countById,
}: {
	reps: FlatItem[];
	countById: Map<string, number>;
}) {
	return (
		<aside data-testid="pool">
			<div className="bg-panel text-panel-foreground ring-foreground/5 flex flex-col gap-3 rounded-xl p-3 ring-1">
				<div className="flex items-center justify-between px-1">
					<h2 className="text-sm font-semibold">Unassigned</h2>
					<span className="text-muted-foreground text-xs tabular-nums">
						{reps.length}
					</span>
				</div>
				<DropZone
					zone={POOL_ZONE}
					accepts={['clothing', 'essential']}
					className={cn(
						'flex min-h-32 flex-col gap-1.5 rounded-lg p-1 transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)]',
						'data-[drop-target]:bg-brand-subtle',
					)}
				>
					{reps.length === 0 ? (
						<EmptyState
							icon={<Inbox />}
							title="Everything is packed"
							description="Drag a provision here to pull it back out of a container."
							className="border-none bg-transparent py-8"
						/>
					) : (
						reps.map((rep, i) => (
							<StackedTile
								key={rep.id}
								item={rep}
								index={i}
								zone={POOL_ZONE}
								count={countById.get(rep.id) ?? 1}
								accept={MIXED_ACCEPT}
								tileTestId="pool-tile"
								countTestId="pool-count"
							/>
						))
					)}
				</DropZone>
			</div>
		</aside>
	);
}

/** A non-real "container" — items dropped here are packed straight into a suitcase. */
function ContainerlessCard({
	tripId,
	reps,
	countById,
	onUnpack,
}: {
	tripId: string;
	reps: FlatItem[];
	countById: Map<string, number>;
	onUnpack: (item: FlatItem) => void;
}) {
	const zone = containerlessZone(tripId);
	return (
		<div data-testid="containerless-card">
			<DropZone
				zone={zone}
				accepts={['clothing', 'essential']}
				className={cn(
					'bg-card ring-foreground/10 flex flex-col gap-2 rounded-xl p-3 ring-1 transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)]',
					'data-[drop-target]:bg-brand-subtle',
				)}
			>
				<div className="flex items-center gap-2.5">
					<span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
						<Luggage className="size-1/2 opacity-60" />
					</span>
					<div className="min-w-0 flex-1">
						<p className="text-sm font-medium">Pack directly into luggage</p>
						<p className="text-muted-foreground text-xs">
							No container · {reps.length} item{reps.length === 1 ? '' : 's'}
						</p>
					</div>
				</div>
				<div className="flex min-h-12 flex-col gap-1.5">
					{reps.length === 0 ? (
						<EmptyState
							icon={<Luggage />}
							title="Drag items here"
							description="They’ll be packed straight into a suitcase, no container needed."
							className="flex-1 border-none bg-transparent py-4"
						/>
					) : (
						reps.map((rep, i) => (
							<StackedTile
								key={rep.id}
								item={rep}
								index={i}
								zone={zone}
								count={countById.get(rep.id) ?? 1}
								accept={MIXED_ACCEPT}
								onRemove={() => onUnpack(rep)}
							/>
						))
					)}
				</div>
			</DropZone>
		</div>
	);
}

function ContainerCard({
	dragRef,
	handleRef,
	isDragging,
	tripId,
	name,
	imageKey,
	type,
	containerProvisionId,
	items,
	countById,
	onUnpack,
}: {
	dragRef: (node: HTMLElement | null) => void;
	handleRef: (node: Element | null) => void;
	isDragging: boolean;
	tripId: string;
	name: string;
	imageKey: string | null;
	type: ContainerType;
	containerProvisionId: string;
	items: FlatItem[];
	countById: Map<string, number>;
	onUnpack: (item: FlatItem) => void;
}) {
	const isClothes = type === ContainerType.Clothes;
	const accept: ItemKind = isClothes ? 'clothing' : 'essential';
	const zone = containerZone(containerProvisionId);

	// The whole card is draggable (it's the Sortable element) so dragging the grip /
	// header reorders it among the trip's containers. The item DropZone wraps ONLY the
	// items area — keeping it off the header so a card dropped on another card's header
	// resolves to the card sortable (reorder), not the item drop zone.
	return (
		<div
			ref={dragRef}
			data-testid="container-card"
			data-name={name}
			className={cn(
				'bg-card ring-foreground/10 flex h-full flex-col gap-3 rounded-xl p-3 ring-1',
				isDragging && 'opacity-50',
			)}
		>
			<div className="flex items-center gap-2">
				<span
					ref={handleRef}
					data-testid="container-grip"
					aria-label={`Reorder ${name}`}
					className="text-muted-foreground/60 hover-hover:hover:text-muted-foreground -ml-0.5 flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md"
				>
					<GripVertical className="size-4" />
				</span>
				<ItemDisplay
					name={name}
					imageKey={imageKey}
					size="chip"
					fallbackIcon={<Package className="size-1/2 opacity-40" />}
					className="min-w-0 flex-1 [&_span:first-child]:font-medium"
					meta={
						<span className="inline-flex items-center gap-1">
							{isClothes ? (
								<TShirt className="size-3" />
							) : (
								<Backpack className="size-3" />
							)}
							{type} · {items.length} item{items.length === 1 ? '' : 's'}
						</span>
					}
				/>
				<RemoveContainerButton
					tripId={tripId}
					containerProvisionId={containerProvisionId}
					name={name}
				/>
			</div>
			<DropZone
				zone={zone}
				accepts={[accept]}
				className={cn(
					'flex min-h-20 flex-1 flex-col gap-1.5 rounded-lg transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)]',
					'data-[drop-target]:bg-brand-subtle',
				)}
			>
				{items.length === 0 ? (
					<EmptyState
						icon={isClothes ? <TShirt /> : <Backpack />}
						title={`Drag ${isClothes ? 'clothing' : 'essentials'} here`}
						className="flex-1 border-none bg-transparent py-6"
					/>
				) : (
					items.map((it, i) => (
						<StackedTile
							key={it.id}
							item={it}
							index={i}
							zone={zone}
							count={countById.get(it.id) ?? 1}
							onRemove={() => onUnpack(it)}
						/>
					))
				)}
			</DropZone>
		</div>
	);
}

function RemoveContainerButton({
	tripId,
	containerProvisionId,
	name,
}: {
	tripId: string;
	containerProvisionId: string;
	name: string;
}) {
	const [open, setOpen] = React.useState(false);
	const remove = useDeleteContainerProvision(tripId);

	async function onConfirm() {
		try {
			await remove.mutateAsync(containerProvisionId);
			toast.success('Container removed from trip');
			setOpen(false);
		} catch {
			// useDeleteContainerProvision surfaces the error via a toast.
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger
				render={
					<Button
						variant="ghost"
						size="icon-sm"
						className="text-muted-foreground hover-hover:hover:text-destructive shrink-0"
						aria-label={`Remove ${name}`}
						onPointerDown={(e) => e.stopPropagation()}
					/>
				}
			>
				<Trash2 />
			</DialogTrigger>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>Remove {name}?</DialogTitle>
					<DialogDescription>
						This takes the container off this trip and returns its items to the
						Unassigned pool. The container itself is not deleted.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter showCloseButton>
					<Button
						type="button"
						variant="destructive"
						loading={remove.isPending}
						onClick={onConfirm}
					>
						Remove
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
