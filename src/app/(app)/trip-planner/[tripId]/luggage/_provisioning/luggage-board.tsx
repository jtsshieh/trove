'use client';

import { Briefcase, Package } from 'lucide-react';
import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { DragAnnouncer, DragBoard, DropZone, Sortable } from '@/components/dnd';
import { EmptyState } from '@/components/ui/empty-state';
import { ItemDisplay } from '@/components/ui/item-display';
import { rankForNeighbors, sortByRank } from '@/lib/dnd/lexorank';
import { useDragBoard, type SortableDrop } from '@/lib/dnd/use-drag-board';
import { encodeZone, type Zone } from '@/lib/dnd/zone';
import { cn } from '@/lib/utils';

import { moveContainerProvisionToLuggage } from './_data/api';
import type { LuggageBoard } from './_data/fetchers';
import { luggageBoardKeys } from './_data/queries';
import {
	BoardContainer,
	ContainerChip,
	containerItemCount,
} from './_components/container-chip';
import { DeleteSuitcaseDialog } from './_components/delete-suitcase-dialog';

type Suitcase = LuggageBoard['luggageProvisions'][number];

const POOL_OWNER = 'pool';
const POOL_ZONE: Zone = { kind: 'closet', ownerId: POOL_OWNER };
const POOL_KEY = encodeZone(POOL_ZONE);
const suitcaseZone = (luggageProvisionId: string): Zone => ({
	kind: 'luggage',
	ownerId: luggageProvisionId,
});

const getRank = (cp: BoardContainer) => cp.luggageOrder ?? '';

/** A flat working copy of every container, so optimistic moves are one update. */
function flatten(board: LuggageBoard): BoardContainer[] {
	return [
		...board.containerProvisions,
		...board.luggageProvisions.flatMap((lp) => lp.containerProvisions),
	];
}

/** Build the controlled groups: the unassigned pool + one group per suitcase. */
function buildGroups(board: LuggageBoard): Record<string, BoardContainer[]> {
	const flat = flatten(board);
	// Pool order is the catalog order (container.order), not luggageOrder.
	const groups: Record<string, BoardContainer[]> = {
		[POOL_KEY]: flat
			.filter((cp) => cp.luggageProvisionId === null)
			.sort((a, b) => a.container.order.localeCompare(b.container.order)),
	};
	for (const lp of board.luggageProvisions) {
		groups[encodeZone(suitcaseZone(lp.id))] = sortByRank(
			flat.filter((cp) => cp.luggageProvisionId === lp.id),
			getRank,
		);
	}
	return groups;
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
		(drop: SortableDrop<BoardContainer>) => {
			const { id, fromZone, toZone, destItems, index, sameZone } = drop;

			// Dropped into the Unassigned pool.
			if (toZone.kind === 'closet') {
				// Pool reorder isn't persisted (the pool is the fixed catalog order).
				if (fromZone.kind === 'closet') return;
				// From a suitcase → remove back to the pool.
				void persist(
					() =>
						moveContainerProvisionToLuggage(id, {
							luggageProvisionId: null,
							luggageOrder: null,
						}),
					'Moved',
					'Could not remove from suitcase',
				);
				return;
			}

			// Dropped into a suitcase (reorder within or move into it).
			const rank = rankForNeighbors(destItems, index, getRank);
			void persist(
				() =>
					moveContainerProvisionToLuggage(id, {
						luggageProvisionId: toZone.ownerId,
						luggageOrder: rank,
					}),
				sameZone ? 'Reordered' : 'Moved',
				sameZone ? 'Could not reorder' : 'Could not move container',
			);
		},
		[persist],
	);

	const { groups, write, props } = useDragBoard<BoardContainer>({
		groups: () => buildGroups(board),
		deps: [board],
		onSortableDrop,
	});

	const pool = groups[POOL_KEY] ?? [];

	/** Pull a packed container back out of its suitcase, into the Unassigned pool. */
	const removeFromSuitcase = React.useCallback(
		(containerProvisionId: string) => {
			// Optimistically remove from whatever suitcase holds it; the refetch puts
			// it back in the pool.
			write((g) => {
				const next: Record<string, BoardContainer[]> = {};
				for (const [k, arr] of Object.entries(g))
					next[k] = arr.filter((cp) => cp.id !== containerProvisionId);
				return next;
			});
			void persist(
				() =>
					moveContainerProvisionToLuggage(containerProvisionId, {
						luggageProvisionId: null,
						luggageOrder: null,
					}),
				'Moved',
				'Could not remove from suitcase',
			);
		},
		[write, persist],
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
				<UnassignedPool containers={pool} />
				<div className="grid auto-rows-min gap-4 xl:grid-cols-2">
					{board.luggageProvisions.map((lp) => (
						<SuitcaseCard
							key={lp.id}
							tripId={tripId}
							suitcase={lp}
							containers={groups[encodeZone(suitcaseZone(lp.id))] ?? []}
							onRemove={removeFromSuitcase}
						/>
					))}
				</div>
			</div>
		</DragBoard>
	);
}

/** Left rail: every container not yet assigned to a suitcase. Drop here to remove. */
function UnassignedPool({ containers }: { containers: BoardContainer[] }) {
	return (
		<div
			data-testid="luggage-pool"
			className="flex flex-col gap-3 lg:sticky lg:top-4 lg:self-start"
		>
			<div className="flex items-center justify-between gap-2 px-0.5">
				<h2 className="text-sm font-semibold">Unassigned containers</h2>
				<span className="text-xs text-muted-foreground tabular-nums">
					{containers.length}
				</span>
			</div>
			<DropZone
				zone={POOL_ZONE}
				accepts={['container']}
				className={cn(
					'flex min-h-32 flex-col gap-2 rounded-xl bg-panel p-2 text-panel-foreground ring-1 ring-foreground/10 transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)]',
					'data-[drop-target]:bg-brand-subtle',
				)}
			>
				{containers.length === 0 ? (
					<EmptyState
						icon={<Package />}
						title="Everything's packed"
						description="Every container is in a suitcase. Drag one here to set it aside."
						className="flex-1 border-0 bg-transparent px-3 py-6"
					/>
				) : (
					containers.map((cp, i) => (
						<Sortable
							key={cp.id}
							id={cp.id}
							index={i}
							type="container"
							zone={POOL_ZONE}
							accept={['container']}
						>
							{({ ref, handleRef, isDragging }) => (
								<ContainerChip
									cp={cp}
									dragRef={ref}
									handleRef={handleRef}
									isDragging={isDragging}
								/>
							)}
						</Sortable>
					))
				)}
			</DropZone>
		</div>
	);
}

/** One suitcase: header with fill indicator, then its ordered containers as a drop zone. */
function SuitcaseCard({
	tripId,
	suitcase,
	containers,
	onRemove,
}: {
	tripId: string;
	suitcase: Suitcase;
	containers: BoardContainer[];
	onRemove: (containerProvisionId: string) => void;
}) {
	const zone = suitcaseZone(suitcase.id);
	const itemTotal = containers.reduce((a, cp) => a + containerItemCount(cp), 0);

	// The WHOLE card is the drop zone (header + containers), so a container can be
	// dropped anywhere on a suitcase.
	return (
		<section data-testid="suitcase-card" data-name={suitcase.luggage.name}>
			<DropZone
				zone={zone}
				accepts={['container']}
				className={cn(
					'flex h-full flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)]',
					'data-[drop-target]:bg-brand-subtle',
				)}
			>
				<header className="flex items-center gap-2 border-b border-border px-3 py-2.5">
					<ItemDisplay
						name={suitcase.luggage.name}
						imageKey={suitcase.luggage.imageKey}
						fallbackIcon={<Briefcase className="size-1/2 opacity-40" />}
						size="panel"
						meta={
							containers.length === 0
								? 'Empty'
								: `${containers.length} ${containers.length === 1 ? 'container' : 'containers'} · ${itemTotal} ${itemTotal === 1 ? 'item' : 'items'}`
						}
						className="min-w-0 flex-1"
					/>
					<DeleteSuitcaseDialog
						tripId={tripId}
						luggageProvisionId={suitcase.id}
						name={suitcase.luggage.name}
					/>
				</header>
				<div className="flex min-h-28 flex-1 flex-col gap-2 p-2">
					{containers.length === 0 ? (
						<EmptyState
							icon={<Package />}
							title="Drag containers here"
							description="Drop a container from the left to pack it into this suitcase."
							className="flex-1 justify-center border-0 bg-transparent px-3 py-6"
						/>
					) : (
						containers.map((cp, i) => (
							<Sortable
								key={cp.id}
								id={cp.id}
								index={i}
								type="container"
								zone={zone}
								accept={['container']}
							>
								{({ ref, handleRef, isDragging }) => (
									<ContainerChip
										cp={cp}
										dragRef={ref}
										handleRef={handleRef}
										isDragging={isDragging}
										onRemove={() => onRemove(cp.id)}
									/>
								)}
							</Sortable>
						))
					)}
				</div>
			</DropZone>
		</section>
	);
}
