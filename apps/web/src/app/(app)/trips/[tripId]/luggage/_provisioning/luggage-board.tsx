'use client';

import { Briefcase, GripVertical, Package } from 'lucide-react';
import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { DragAnnouncer, DragBoard, DropZone, Sortable } from '@/components/dnd';
import { EmptyState } from '@/components/ui/empty-state';
import { ItemDisplay } from '@/components/ui/item-display';
import { rankForNeighbors, sortByRank } from '@/lib/dnd/lexorank';
import { useDragBoard, type SortableDrop } from '@/lib/dnd/use-drag-board';
import { encodeZone, type ItemType, type Zone } from '@/lib/dnd/zone';
import { generateClothingName } from '@/lib/generate-clothing-name';
import { cn } from '@/lib/utils';

import {
	changeLuggageProvisionTripOrder,
	moveClothingProvisionToLuggage,
	moveContainerProvisionToLuggage,
	moveEssentialProvisionToLuggage,
} from './_data/api';
import type { LuggageBoard } from './_data/fetchers';
import { resolveEssentialItem } from '../../_data/essential-item';
import { luggageBoardKeys } from './_data/queries';
import {
	BoardContainer,
	ContainerChip,
	containerItemCount,
} from './_components/container-chip';
import { DeleteSuitcaseDialog } from './_components/delete-suitcase-dialog';
import { LuggageKindPicker } from './_components/luggage-kind-picker';
import { ProvisionTile } from '../../containers/_provisioning/_components/provision-tile';

type Suitcase = LuggageBoard['luggageProvisions'][number];
type ItemKind = Extract<ItemType, 'clothing' | 'essential'>;

/** A flat container entry, normalized for the board (pool + suitcases). */
interface ContainerEntry {
	id: string;
	type: 'container';
	cp: BoardContainer;
	luggageProvisionId: string | null;
	luggageOrder: string | null;
}

/** A direct ("containerless") item entry — packed straight into a suitcase. */
interface DirectEntry {
	id: string;
	type: ItemKind;
	/** Clothing id (so identical clothing stacks); null for essentials. */
	clothingId: string | null;
	name: string;
	imageKey?: string | null;
	luggageProvisionId: string | null;
	luggageOrder: string | null;
}

/** A suitcase card, reorderable within the trip's suitcases board. */
interface CardEntry {
	id: string;
	type: 'suitcase';
	tripOrder: string | null;
}

type BoardEntry = ContainerEntry | DirectEntry | CardEntry;

const POOL_OWNER = 'pool';
const POOL_ZONE: Zone = { kind: 'closet', ownerId: POOL_OWNER };
const POOL_KEY = encodeZone(POOL_ZONE);
const suitcaseZone = (luggageProvisionId: string): Zone => ({
	kind: 'luggage',
	ownerId: luggageProvisionId,
});
const cardsZone = (tripId: string): Zone => ({
	kind: 'luggageCards',
	ownerId: tripId,
});

const getLuggageRank = (e: ContainerEntry | DirectEntry) =>
	e.luggageOrder ?? '';

/** Normalize a board's containers + direct items into flat, board-local entries. */
function flatten(board: LuggageBoard): (ContainerEntry | DirectEntry)[] {
	const items: (ContainerEntry | DirectEntry)[] = [];

	const pushContainer = (cp: BoardContainer) =>
		items.push({
			id: cp.id,
			type: 'container',
			cp,
			luggageProvisionId: cp.luggageProvisionId,
			luggageOrder: cp.luggageOrder,
		});

	const pushClothing = (
		p: Suitcase['clothingProvisions'][number],
		luggageProvisionId: string | null,
	) =>
		items.push({
			id: p.id,
			type: 'clothing',
			clothingId: p.clothingId,
			name: generateClothingName(p.clothing),
			imageKey: p.clothing.imageKey,
			luggageProvisionId,
			luggageOrder: p.luggageOrder,
		});

	const pushEssential = (
		p: Suitcase['essentialProvisions'][number],
		luggageProvisionId: string | null,
	) => {
		const item = resolveEssentialItem(p);
		items.push({
			id: p.id,
			type: 'essential',
			clothingId: null,
			name: item.name,
			imageKey: item.imageKey,
			luggageProvisionId,
			luggageOrder: p.luggageOrder,
		});
	};

	for (const cp of board.containerProvisions) pushContainer(cp);
	for (const p of board.clothingProvisions) pushClothing(p, null);
	for (const p of board.essentialProvisions) pushEssential(p, null);
	for (const lp of board.luggageProvisions) {
		for (const cp of lp.containerProvisions) pushContainer(cp);
		for (const p of lp.clothingProvisions) pushClothing(p, lp.id);
		for (const p of lp.essentialProvisions) pushEssential(p, lp.id);
	}

	return items;
}

/**
 * Collapse identical free-floating clothing into one representative + a ×count
 * (preserving order). Containers and essentials are never merged — one rep each.
 */
function stackDirect(entries: (ContainerEntry | DirectEntry)[]): {
	reps: (ContainerEntry | DirectEntry)[];
	countById: Map<string, number>;
} {
	const reps: (ContainerEntry | DirectEntry)[] = [];
	const countById = new Map<string, number>();
	const repByClothing = new Map<string, DirectEntry>();
	for (const e of entries) {
		if (e.type !== 'container' && e.clothingId) {
			const rep = repByClothing.get(e.clothingId);
			if (rep) countById.set(rep.id, (countById.get(rep.id) ?? 1) + 1);
			else {
				repByClothing.set(e.clothingId, e);
				reps.push(e);
				countById.set(e.id, 1);
			}
		} else {
			reps.push(e);
			countById.set(e.id, 1);
		}
	}
	return { reps, countById };
}

/**
 * Build every controlled group: the unassigned pool, one group per suitcase
 * (its containers AND direct items share a single luggageOrder-ordered scope),
 * and the reorderable suitcase cards. Identical free-floating items collapse into a
 * single ×N stack (containers stay distinct). `countById` keys each rep → its count.
 */
function buildBoard(
	board: LuggageBoard,
	tripId: string,
): { groups: Record<string, BoardEntry[]>; countById: Map<string, number> } {
	const flat = flatten(board);
	const groups: Record<string, BoardEntry[]> = {};
	const countById = new Map<string, number>();

	// Pool: loose containers (catalog order), then stacked loose direct items.
	const poolContainers = flat
		.filter(
			(e): e is ContainerEntry =>
				e.type === 'container' && e.luggageProvisionId === null,
		)
		.sort((a, b) => a.cp.container.order.localeCompare(b.cp.container.order));
	const poolDirect = stackDirect(
		flat.filter((e) => e.type !== 'container' && e.luggageProvisionId === null),
	);
	for (const [id, n] of poolDirect.countById) countById.set(id, n);
	groups[POOL_KEY] = [...poolContainers, ...poolDirect.reps];

	for (const lp of board.luggageProvisions) {
		const inLp = flat.filter((e) => e.luggageProvisionId === lp.id);
		const containers = inLp.filter((e): e is ContainerEntry => e.type === 'container');
		const direct = stackDirect(inLp.filter((e) => e.type !== 'container'));
		for (const [id, n] of direct.countById) countById.set(id, n);
		groups[encodeZone(suitcaseZone(lp.id))] = sortByRank(
			[...containers, ...direct.reps],
			getLuggageRank,
		);
	}

	groups[encodeZone(cardsZone(tripId))] = board.luggageProvisions.map((lp) => ({
		id: lp.id,
		type: 'suitcase' as const,
		tripOrder: lp.tripOrder,
	}));

	return { groups, countById };
}

export function LuggageBoard({
	tripId,
	board,
}: {
	tripId: string;
	board: LuggageBoard;
}) {
	const queryClient = useQueryClient();
	const invalidateBoard = React.useCallback(
		() =>
			queryClient.invalidateQueries({
				queryKey: luggageBoardKeys.board(tripId),
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

			// Reordering a suitcase card within the trip.
			if (type === 'suitcase') {
				if (!sameZone) return;
				const rank = rankForNeighbors(
					destItems as CardEntry[],
					index,
					(c) => c.tripOrder ?? '',
				);
				void persist(
					() => changeLuggageProvisionTripOrder(id, rank),
					'Reordered',
					'Could not reorder suitcase',
				);
				return;
			}

			// Dropped into the Unassigned pool → unassign from its suitcase.
			if (toZone.kind === 'closet') {
				// Pool reorder isn't persisted (the pool is the fixed catalog order).
				if (fromZone.kind === 'closet') return;
				if (type === 'container') {
					void persist(
						() =>
							moveContainerProvisionToLuggage(id, {
								luggageProvisionId: null,
								luggageOrder: null,
							}),
						'Moved',
						'Could not remove from suitcase',
					);
				} else {
					void persist(
						() =>
							(type === 'clothing'
								? moveClothingProvisionToLuggage
								: moveEssentialProvisionToLuggage)(id, {
								luggageProvisionId: null,
								luggageOrder: null,
							}),
						'Moved',
						'Could not remove from suitcase',
					);
				}
				return;
			}

			// Dropped into a suitcase (reorder within or move into it). Containers and
			// direct items share the suitcase's luggageOrder-ordered scope.
			const luggageProvisionId = toZone.ownerId;
			const rank = rankForNeighbors(
				destItems as (ContainerEntry | DirectEntry)[],
				index,
				getLuggageRank,
			);
			if (type === 'container') {
				void persist(
					() =>
						moveContainerProvisionToLuggage(id, {
							luggageProvisionId,
							luggageOrder: rank,
						}),
					sameZone ? 'Reordered' : 'Moved',
					sameZone ? 'Could not reorder' : 'Could not move container',
				);
			} else {
				void persist(
					() =>
						(type === 'clothing'
							? moveClothingProvisionToLuggage
							: moveEssentialProvisionToLuggage)(id, {
							luggageProvisionId,
							luggageOrder: rank,
						}),
					sameZone ? 'Reordered' : 'Moved',
					sameZone ? 'Could not reorder' : 'Could not move item',
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

	const pool = (groups[POOL_KEY] ?? []) as (ContainerEntry | DirectEntry)[];
	const cards = (groups[encodeZone(cardsZone(tripId))] ?? []) as CardEntry[];

	/** Pull a packed container / direct item back out of its suitcase, to the pool. */
	const removeFromSuitcase = React.useCallback(
		(entry: ContainerEntry | DirectEntry) => {
			// Optimistically remove from whatever suitcase holds it; the refetch puts
			// it back in the pool.
			write((g) => {
				const next: Record<string, BoardEntry[]> = {};
				for (const [k, arr] of Object.entries(g))
					next[k] = arr.filter((it) => it.id !== entry.id);
				return next;
			});
			if (entry.type === 'container') {
				void persist(
					() =>
						moveContainerProvisionToLuggage(entry.id, {
							luggageProvisionId: null,
							luggageOrder: null,
						}),
					'Moved',
					'Could not remove from suitcase',
				);
			} else {
				void persist(
					() =>
						(entry.type === 'clothing'
							? moveClothingProvisionToLuggage
							: moveEssentialProvisionToLuggage)(entry.id, {
							luggageProvisionId: null,
							luggageOrder: null,
						}),
					'Moved',
					'Could not remove from suitcase',
				);
			}
		},
		[write, persist],
	);

	// Map cards (in their persisted order) back to the full suitcase for rendering.
	const lpById = React.useMemo(
		() => new Map(board.luggageProvisions.map((lp) => [lp.id, lp])),
		[board.luggageProvisions],
	);

	if (board.luggageProvisions.length === 0) {
		return (
			<EmptyState
				icon={<Briefcase />}
				title="No suitcases on this trip yet"
				description="Add a suitcase, then drag your containers into it to plan exactly how everything is packed."
			/>
		);
	}

	return (
		<DragBoard {...props}>
			<DragAnnouncer />
			<div className="grid gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
				<UnassignedPool entries={pool} countById={countById} />
				<DropZone
					zone={cardsZone(tripId)}
					accepts={['suitcase']}
					className="grid auto-rows-min gap-4 xl:grid-cols-2"
				>
					{cards.map((card, i) => {
						const lp = lpById.get(card.id);
						if (!lp) return null;
						return (
							<Sortable
								key={card.id}
								id={card.id}
								index={i}
								type="suitcase"
								zone={cardsZone(tripId)}
								accept={['suitcase']}
							>
								{({ ref, handleRef, isDragging }) => (
									<SuitcaseCard
										dragRef={ref}
										handleRef={handleRef}
										isDragging={isDragging}
										tripId={tripId}
										suitcase={lp}
										entries={
											(groups[encodeZone(suitcaseZone(lp.id))] ?? []) as (
												| ContainerEntry
												| DirectEntry
											)[]
										}
										countById={countById}
										onRemove={removeFromSuitcase}
									/>
								)}
							</Sortable>
						);
					})}
				</DropZone>
			</div>
		</DragBoard>
	);
}

/** Render one board entry (a container chip or a direct item tile + ×N stack badge). */
function EntryTile({
	entry,
	index,
	zone,
	count = 1,
	onRemove,
}: {
	entry: ContainerEntry | DirectEntry;
	index: number;
	zone: Zone;
	count?: number;
	onRemove?: () => void;
}) {
	if (entry.type === 'container') {
		return (
			<Sortable
				id={entry.id}
				index={index}
				type="container"
				zone={zone}
				accept={['container']}
			>
				{({ ref, handleRef, isDragging }) => (
					<ContainerChip
						cp={entry.cp}
						dragRef={ref}
						handleRef={handleRef}
						isDragging={isDragging}
						onRemove={onRemove}
					/>
				)}
			</Sortable>
		);
	}

	return (
		<div
			className="relative"
			data-testid="luggage-direct-item"
			data-name={entry.name}
		>
			<ProvisionTile
				item={{
					id: entry.id,
					type: entry.type,
					name: entry.name,
					imageKey: entry.imageKey,
				}}
				index={index}
				zone={zone}
				onRemove={onRemove}
			/>
			{count > 1 && (
				<span
					data-testid="luggage-direct-count"
					className="bg-brand text-brand-foreground pointer-events-none absolute top-1 right-1 z-10 rounded-full px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums shadow-sm"
					title={`${count} units`}
				>
					×{count}
				</span>
			)}
		</div>
	);
}

/** A small muted label that separates the pool's containers from its loose items. */
function PoolDivider({ label }: { label: string }) {
	return (
		<div className="text-muted-foreground flex items-center gap-2 px-1 pt-1 text-[0.65rem] font-semibold tracking-wide uppercase">
			<span>{label}</span>
			<span className="bg-border h-px flex-1" />
		</div>
	);
}

/**
 * Left rail: every container + direct item not yet assigned to a suitcase. Containers
 * and loose (direct-to-luggage) items are shown in labelled groups so the two kinds
 * read as distinct; identical loose items collapse into one ×N tile. The pool stays a
 * single drop zone — entries keep their index in the combined array.
 */
function UnassignedPool({
	entries,
	countById,
}: {
	entries: (ContainerEntry | DirectEntry)[];
	countById: Map<string, number>;
}) {
	// `entries` is ordered [containers…, direct…] (see buildBoard), so a direct item's
	// index in the full array is offset by the container count.
	const containers = entries.filter(
		(e): e is ContainerEntry => e.type === 'container',
	);
	const direct = entries.filter((e) => e.type !== 'container');

	return (
		<div
			data-testid="luggage-pool"
			className="flex flex-col gap-3 lg:sticky lg:top-4 lg:self-start"
		>
			<div className="flex items-center justify-between gap-2 px-0.5">
				<h2 className="text-sm font-semibold">Unassigned</h2>
				<span className="text-muted-foreground text-xs tabular-nums">
					{entries.length}
				</span>
			</div>
			<DropZone
				zone={POOL_ZONE}
				accepts={['container', 'clothing', 'essential']}
				className={cn(
					'flex min-h-32 flex-col gap-2 rounded-xl bg-panel p-2 text-panel-foreground ring-1 ring-foreground/10 transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)]',
					'data-[drop-target]:bg-brand-subtle',
				)}
			>
				{entries.length === 0 ? (
					<EmptyState
						icon={<Package />}
						title="Everything's packed"
						description="Every container and item is in a suitcase. Drag one here to set it aside."
						className="flex-1 border-0 bg-transparent px-3 py-6"
					/>
				) : (
					<>
						{containers.length > 0 && (
							<>
								<PoolDivider label="Containers" />
								{containers.map((entry, i) => (
									<EntryTile
										key={entry.id}
										entry={entry}
										index={i}
										zone={POOL_ZONE}
									/>
								))}
							</>
						)}
						{direct.length > 0 && (
							<>
								<PoolDivider label="Loose items" />
								{direct.map((entry, j) => (
									<EntryTile
										key={entry.id}
										entry={entry}
										index={containers.length + j}
										zone={POOL_ZONE}
										count={countById.get(entry.id) ?? 1}
									/>
								))}
							</>
						)}
					</>
				)}
			</DropZone>
		</div>
	);
}

/** One suitcase: header with a reorder grip, then its ordered contents as a drop zone. */
function SuitcaseCard({
	dragRef,
	handleRef,
	isDragging,
	tripId,
	suitcase,
	entries,
	countById,
	onRemove,
}: {
	dragRef: (node: HTMLElement | null) => void;
	handleRef: (node: Element | null) => void;
	isDragging: boolean;
	tripId: string;
	suitcase: Suitcase;
	entries: (ContainerEntry | DirectEntry)[];
	countById: Map<string, number>;
	onRemove: (entry: ContainerEntry | DirectEntry) => void;
}) {
	const zone = suitcaseZone(suitcase.id);
	const containerCount = entries.filter((e) => e.type === 'container').length;
	const directCount = entries.length - containerCount;
	const itemTotal =
		entries.reduce(
			(a, e) => a + (e.type === 'container' ? containerItemCount(e.cp) : 0),
			0,
		) + directCount;

	// The whole card is draggable (it's the Sortable element), so dragging the grip /
	// header reorders it among the trip's suitcases. The contents DropZone wraps ONLY
	// the contents area — keeping it off the header so a card dropped on another card's
	// header resolves to the card sortable (reorder), not the contents drop zone.
	return (
		<section
			ref={dragRef}
			data-testid="suitcase-card"
			data-name={suitcase.luggage.name}
			className={cn(
				'flex h-full flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10',
				isDragging && 'opacity-50',
			)}
		>
			<header className="border-border flex items-center gap-2 border-b px-3 py-2.5">
				<span
					ref={handleRef}
					data-testid="suitcase-grip"
					aria-label={`Reorder ${suitcase.luggage.name}`}
					className="text-muted-foreground/60 hover-hover:hover:text-muted-foreground -ml-0.5 flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md"
				>
					<GripVertical className="size-4" />
				</span>
				<ItemDisplay
					name={suitcase.luggage.name}
					imageKey={suitcase.luggage.imageKey}
					fallbackIcon={<Briefcase className="size-1/2 opacity-40" />}
					size="panel"
					meta={
						entries.length === 0
							? 'Empty'
							: `${containerCount} ${containerCount === 1 ? 'container' : 'containers'} · ${itemTotal} ${itemTotal === 1 ? 'item' : 'items'}`
					}
					className="min-w-0 flex-1"
				/>
				<DeleteSuitcaseDialog
					tripId={tripId}
					luggageProvisionId={suitcase.id}
					name={suitcase.luggage.name}
				/>
			</header>
			<div className="border-border flex items-center justify-between gap-2 border-b px-3 py-2">
				<span className="text-muted-foreground text-xs font-medium">
					Checked in as
				</span>
				<LuggageKindPicker
					tripId={tripId}
					luggageProvisionId={suitcase.id}
					kind={suitcase.kind}
				/>
			</div>
			<DropZone
				zone={zone}
				accepts={['container', 'clothing', 'essential']}
				className={cn(
					'flex min-h-28 flex-1 flex-col gap-2 p-2 transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)]',
					'data-[drop-target]:bg-brand-subtle',
				)}
			>
				{entries.length === 0 ? (
					<EmptyState
						icon={<Package />}
						title="Drag containers or items here"
						description="Drop a container or a direct item from the left to pack it into this suitcase."
						className="flex-1 justify-center border-0 bg-transparent px-3 py-6"
					/>
				) : (
					entries.map((entry, i) => (
						<EntryTile
							key={entry.id}
							entry={entry}
							index={i}
							zone={zone}
							count={countById.get(entry.id) ?? 1}
							onRemove={() => onRemove(entry)}
						/>
					))
				)}
			</DropZone>
		</section>
	);
}
