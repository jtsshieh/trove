'use client';

import { TShirt } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { Backpack, Inbox, Package, Trash2 } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

import { DragAnnouncer, DragBoard, DropZone } from '@/components/dnd';
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

import {
	changeClothingProvisionContainerOrder,
	changeEssentialProvisionContainerOrder,
	deleteClothingProvisionFromContainer,
	deleteEssentialProvisionFromContainer,
	moveClothingProvisionToContainer,
	moveEssentialProvisionToContainer,
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
	/** Owning containerProvision id, or null while in the Unassigned pool. */
	containerProvisionId: string | null;
	containerOrder: string | null;
}

const POOL = '__pool__';
const POOL_ZONE: Zone = { kind: 'closet', ownerId: POOL };
const POOL_KEY = encodeZone(POOL_ZONE);
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
		});

	const pushEssential = (
		p: ContainersBoard['essentialProvisions'][number],
		containerProvisionId: string | null,
	) =>
		items.push({
			id: p.id,
			type: 'essential',
			clothingId: null,
			name: p.essential.name,
			imageKey: p.essential.imageKey,
			containerProvisionId,
			containerOrder: p.containerOrder,
		});

	for (const p of board.clothingProvisions) pushClothing(p, null);
	for (const p of board.essentialProvisions) pushEssential(p, null);
	for (const cp of board.containerProvisions) {
		for (const p of cp.clothingProvisions) pushClothing(p, cp.id);
		for (const p of cp.essentialProvisions) pushEssential(p, cp.id);
	}

	return items;
}

/**
 * Collapse the unassigned pool to one representative per distinct clothing (a piece
 * reused across days is one owned unit to pack), capped so pool + already-packed
 * units never exceed the trip's bringing. Returns the representative items (the
 * controlled pool group) plus the ×count to badge each one with.
 */
function splitPool(board: ContainersBoard): {
	reps: FlatItem[];
	countById: Map<string, number>;
} {
	const flat = flatten(board);
	const poolItems = flat.filter((it) => !it.containerProvisionId);

	const bringMap = new Map<string, number>();
	const ownedById = new Map<string, number>();
	for (const p of board.clothingProvisions)
		ownedById.set(p.clothingId, p.clothing.quantity);
	for (const cp of board.containerProvisions)
		for (const p of cp.clothingProvisions)
			ownedById.set(p.clothingId, p.clothing.quantity);
	for (const [clothingId, owned] of ownedById) bringMap.set(clothingId, owned);
	for (const b of board.clothingBrings) bringMap.set(b.clothingId, b.bringing);

	const packedByClothing = new Map<string, number>();
	for (const it of flat)
		if (it.containerProvisionId && it.clothingId)
			packedByClothing.set(
				it.clothingId,
				(packedByClothing.get(it.clothingId) ?? 0) + 1,
			);

	const reps: FlatItem[] = [];
	const countById = new Map<string, number>();
	const clothingGroups = new Map<string, FlatItem[]>();

	for (const item of poolItems) {
		if (item.type === 'clothing' && item.clothingId) {
			const list = clothingGroups.get(item.clothingId) ?? [];
			list.push(item);
			clothingGroups.set(item.clothingId, list);
			continue;
		}
		// Essentials are never reused — one rep each, count 1.
		reps.push(item);
		countById.set(item.id, 1);
	}

	for (const [clothingId, group] of clothingGroups) {
		const bringing = bringMap.get(clothingId) ?? group.length;
		const packed = packedByClothing.get(clothingId) ?? 0;
		const count = Math.min(group.length, Math.max(0, bringing - packed));
		if (count === 0) continue;
		reps.push(group[0]);
		countById.set(group[0].id, count);
	}

	return { reps, countById };
}

/** Build the controlled groups: the deduped pool + one group per container. */
function buildGroups(board: ContainersBoard): Record<string, FlatItem[]> {
	const flat = flatten(board);
	const groups: Record<string, FlatItem[]> = {
		[POOL_KEY]: splitPool(board).reps,
	};
	for (const cp of board.containerProvisions) {
		groups[encodeZone(containerZone(cp.id))] = sortByRank(
			flat.filter((it) => it.containerProvisionId === cp.id),
			(it) => it.containerOrder ?? '',
		);
	}
	return groups;
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
		(drop: SortableDrop<FlatItem>) => {
			const { id, type, fromZone, toZone, destItems, index, sameZone } = drop;
			const kind = type as ItemKind;

			// Dropped into the Unassigned pool.
			if (toZone.kind === 'closet') {
				// Pool reorder isn't persisted (the pool is a deduped view).
				if (fromZone.kind === 'closet') return;
				// From a container → unpack back to the pool.
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

			// Dropped into a container.
			const containerProvisionId = toZone.ownerId;
			const rank = rankForNeighbors(
				destItems,
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

	const { groups, write, props } = useDragBoard<FlatItem>({
		groups: () => buildGroups(board),
		deps: [board],
		onSortableDrop,
	});

	const countById = React.useMemo(() => splitPool(board).countById, [board]);

	const containers = board.containerProvisions;
	const poolReps = groups[POOL_KEY] ?? [];

	// Progress (in provisions) from server truth — the bar settles on the refetch.
	const { total, packed } = React.useMemo(() => {
		const inContainers = board.containerProvisions.reduce(
			(n, cp) =>
				n + cp.clothingProvisions.length + cp.essentialProvisions.length,
			0,
		);
		const loose =
			board.clothingProvisions.length + board.essentialProvisions.length;
		return { total: inContainers + loose, packed: inContainers };
	}, [board]);

	/** Pull a packed item back out of its container, into the Unassigned pool. */
	const unpack = React.useCallback(
		(item: FlatItem) => {
			// Optimistically remove from whatever container holds it; the refetch puts
			// it back in the pool.
			write((g) => {
				const next: Record<string, FlatItem[]> = {};
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

	return (
		<DragBoard {...props}>
			<DragAnnouncer />
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr] lg:items-start">
				<UnassignedPool reps={poolReps} countById={countById} />
				<div className="flex flex-col gap-3">
					<div className="flex items-center justify-between gap-3 px-0.5">
						<p className="text-sm font-medium">
							Containers
							<span className="text-muted-foreground ml-2 tabular-nums">
								{packed}/{total} packed
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
						<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
							{containers.map((cp) => (
								<ContainerCard
									key={cp.id}
									tripId={tripId}
									name={cp.container.name}
									imageKey={cp.container.imageKey}
									type={cp.container.type}
									containerProvisionId={cp.id}
									items={groups[encodeZone(containerZone(cp.id))] ?? []}
									onUnpack={unpack}
								/>
							))}
						</div>
					)}
				</div>
			</div>
		</DragBoard>
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
		<aside className="lg:sticky lg:top-24" data-testid="pool">
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
						reps.map((rep, i) => {
							const count = countById.get(rep.id) ?? 1;
							return (
								<div
									key={rep.id}
									className="relative"
									data-testid="pool-tile"
									data-name={rep.name}
								>
									<ProvisionTile item={rep} index={i} zone={POOL_ZONE} />
									{count > 1 && (
										<span
											data-testid="pool-count"
											className="bg-brand text-brand-foreground pointer-events-none absolute top-1 right-1 z-10 rounded-full px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums shadow-sm"
											title={`${count} units unassigned`}
										>
											×{count}
										</span>
									)}
								</div>
							);
						})
					)}
				</DropZone>
			</div>
		</aside>
	);
}

function ContainerCard({
	tripId,
	name,
	imageKey,
	type,
	containerProvisionId,
	items,
	onUnpack,
}: {
	tripId: string;
	name: string;
	imageKey: string | null;
	type: ContainerType;
	containerProvisionId: string;
	items: FlatItem[];
	onUnpack: (item: FlatItem) => void;
}) {
	const isClothes = type === ContainerType.Clothes;
	const accept: ItemKind = isClothes ? 'clothing' : 'essential';
	const zone = containerZone(containerProvisionId);

	// The WHOLE card is the drop zone (header + items), so a provision can be dropped
	// anywhere on a container, not just the thin items strip.
	return (
		<div data-testid="container-card" data-name={name}>
			<DropZone
				zone={zone}
				accepts={[accept]}
				className={cn(
					'bg-card ring-foreground/10 flex h-full flex-col gap-3 rounded-xl p-3 ring-1 transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)]',
					'data-[drop-target]:bg-brand-subtle',
				)}
			>
				<div className="flex items-center gap-2.5">
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
				<div className="flex min-h-20 flex-1 flex-col gap-1.5">
					{items.length === 0 ? (
						<EmptyState
							icon={isClothes ? <TShirt /> : <Backpack />}
							title={`Drag ${isClothes ? 'clothing' : 'essentials'} here`}
							className="flex-1 border-none bg-transparent py-6"
						/>
					) : (
						items.map((it, i) => (
							<ProvisionTile
								key={it.id}
								item={it}
								index={i}
								zone={zone}
								onRemove={() => onUnpack(it)}
							/>
						))
					)}
				</div>
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
