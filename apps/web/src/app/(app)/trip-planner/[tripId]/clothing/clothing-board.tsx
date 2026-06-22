'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import {
	addDays,
	eachDayOfInterval,
	eachWeekOfInterval,
	format,
	isWithinInterval,
	startOfDay,
} from 'date-fns';
import { toast } from 'sonner';

import { DragAnnouncer, DragBoard } from '@/components/dnd';
import { type ItemDisplaySize } from '@/components/ui/item-display';
import {
	PieceSize,
	ProvisionSection,
	ProvisionView,
} from '@/generated/prisma/enums';
import type { Clothing, Trip } from '@/generated/prisma/client';
import { rankForNeighbors, sortByRank } from '@/lib/dnd/lexorank';
import {
	useDragBoard,
	type ExternalDrop,
	type SortableDrop,
} from '@/lib/dnd/use-drag-board';
import { encodeZone, type Zone } from '@/lib/dnd/zone';
import {
	effectiveBringing,
	reuseCount as computeReuseCount,
	reuseCounts,
	whereUsed,
	type BringMap,
} from '@/lib/reuse';
import { cn } from '@/lib/utils';

import {
	assignOutfitToDays,
	changeClothingProvisionDayOrder,
	changeTripOutfitOrder,
	createClothingProvisions,
	moveClothingProvision,
	moveTripOutfitToDay,
} from './_data/api';
import { clothingBoardKeys } from './_data/queries';
import type { TripClothingBoard } from './_data/fetchers';
import type { OutfitWithItems } from '@/app/(app)/outfits/_data/fetchers';
import { useClothingBoardControls } from './board-controls';
import { ClosetSidebar } from './_components/closet-panel';
import {
	DayColumn,
	type DayBucket,
	type DayEntry,
	type PieceStack,
} from './_components/day-column';
import { SectionLane } from './_components/section-lane';
import { PieceCard } from './_components/piece-card';
import type { BoardOutfit, BoardProvision } from './_components/types';

type ClosetClothing = Clothing & { type: { name: string; category: string } };

/**
 * The board's controlled groups hold two kinds of sortable: clothing provisions and
 * outfit groupings (TripOutfit). On a day they live in ONE interleaved list — an
 * outfit can sit between loose pieces — sorted by a shared lexorank (a piece's
 * dayOrder, an outfit's order). They're discriminated at drop time by the dnd item
 * `type` ('clothing' vs 'trip-outfit').
 */
type BoardEntry = BoardProvision | BoardOutfit;

/** A day entry is an outfit grouping (vs a clothing piece) when it has no clothingId. */
function isDayOutfit(entry: BoardEntry): entry is BoardOutfit {
	return !('clothingId' in entry);
}

/** The shared rank an entry sorts by within its day's single interleaved list. */
function entryRank(entry: BoardEntry): string {
	return isDayOutfit(entry) ? entry.order : entry.dayOrder;
}

// ——— zones ———
const dayZone = (key: string): Zone => ({ kind: 'day', ownerId: key });
const outfitZone = (id: string): Zone => ({ kind: 'outfit', ownerId: id });
const universalZone = (tripId: string): Zone => ({
	kind: 'universal',
	ownerId: tripId,
});
const backupZone = (tripId: string): Zone => ({
	kind: 'backup',
	ownerId: tripId,
});

interface Placement {
	section: ProvisionSection;
	day: Date | null;
	tripOutfitId: string | null;
}

/**
 * The controlled groups (one per drop zone) PLUS the per-rep stack counts. Days and
 * outfits dedupe same-clothing duplicates into a representative (×N badge); Universal
 * and Backup show every provision (no dedupe), matching the lanes' rendering. Array
 * order in each group is the display order, so `move()` and the rendered Sortables
 * line up.
 */
function buildBoard(
	board: TripClothingBoard,
	tripId: string,
	days: Date[],
): {
	groups: Record<string, BoardEntry[]>;
	countById: Map<string, number>;
} {
	const provisions = board.clothingProvisions;
	const groups: Record<string, BoardEntry[]> = {};
	const countById = new Map<string, number>();

	const dedupe = (list: BoardProvision[], zone: Zone) => {
		const stacks = stackPieces(sortByRank(list, (p) => p.dayOrder));
		groups[encodeZone(zone)] = stacks.map((s) => s.rep);
		for (const s of stacks) countById.set(s.rep.id, s.count);
	};

	// Each outfit's own pieces (deduped) live in its outfit zone.
	for (const outfit of board.tripOutfits) {
		dedupe(
			provisions.filter((p) => p.tripOutfitId === outfit.id),
			outfitZone(outfit.id),
		);
	}
	// Each day is ONE interleaved list: its loose piece stacks PLUS its outfit
	// groupings, sorted by the shared rank so an outfit can sit anywhere among pieces.
	for (const day of days) {
		const key = dayKey(day);
		const stacks = stackPieces(
			sortByRank(
				provisions.filter(
					(p) =>
						!p.tripOutfitId &&
						p.section === ProvisionSection.Day &&
						!!p.day &&
						dayKey(p.day) === key,
				),
				(p) => p.dayOrder,
			),
		);
		for (const s of stacks) countById.set(s.rep.id, s.count);
		const dayOutfits = board.tripOutfits.filter(
			(o) => dayKey(o.day) === key,
		);
		const merged: BoardEntry[] = [
			...stacks.map((s) => s.rep),
			...dayOutfits,
		];
		merged.sort((a, b) => entryRank(a).localeCompare(entryRank(b)));
		groups[encodeZone(dayZone(key))] = merged;
	}
	// Universal / Backup: every provision (no dedupe — the lanes show them flat).
	groups[encodeZone(universalZone(tripId))] = sortByRank(
		provisions.filter(
			(p) => !p.tripOutfitId && p.section === ProvisionSection.Universal,
		),
		(p) => p.dayOrder,
	);
	groups[encodeZone(backupZone(tripId))] = sortByRank(
		provisions.filter(
			(p) => !p.tripOutfitId && p.section === ProvisionSection.Backup,
		),
		(p) => p.dayOrder,
	);

	return { groups, countById };
}

/** The clothing board client island: list / calendar, drag, closet, day notes. */
export function ClothingBoard({
	trip,
	board,
	closet,
	outfits,
}: {
	trip: Pick<Trip, 'id' | 'start' | 'end'>;
	board: TripClothingBoard;
	closet: ClosetClothing[];
	outfits: OutfitWithItems[];
}) {
	const queryClient = useQueryClient();
	// list/calendar, piece size and the closet toggle are shared with the streamed
	// header actions, so they live in a context that wraps both (see board-controls).
	const { view, pieceSize, closetOpen, toggleCloset, restoreCloset } =
		useClothingBoardControls();
	const large = pieceSize === PieceSize.Large;

	// Apply the saved closet open/closed preference AFTER this board (a Suspense
	// child) hydrates, so it first hydrates closed — matching the server HTML — then
	// opens. Doing it in the provider (outside Suspense) mismatched on hydration.
	useEffect(() => {
		restoreCloset();
	}, [restoreCloset]);

	const invalidateBoard = useCallback(
		() =>
			queryClient.invalidateQueries({
				queryKey: clothingBoardKeys.board(trip.id),
			}),
		[queryClient, trip.id],
	);

	const days = useMemo(
		() => eachDayOfInterval({ start: trip.start, end: trip.end }),
		[trip.start, trip.end],
	);

	const outfitById = useMemo(() => {
		const map = new Map<string, BoardOutfit>();
		for (const o of board.tripOutfits) map.set(o.id, o);
		return map;
	}, [board.tripOutfits]);

	// Persist a write, then re-sync from the server. `invalidate` runs whether the
	// call succeeds or fails, so a rejected move rolls the optimistic UI back to
	// server truth. A soft `{ type: 'error' }` result (e.g. exclusivity) is surfaced.
	const persist = useCallback(
		async (call: () => Promise<unknown>, ok: string, fail: string) => {
			try {
				const res = (await call()) as
					| { type?: string; message?: string }
					| undefined;
				if (res?.type === 'error') toast.error(res.message ?? fail);
				else toast.success(res?.message ?? ok);
			} catch {
				toast.error(fail);
			} finally {
				await invalidateBoard();
			}
		},
		[invalidateBoard],
	);

	/** Resolve a drop-target zone into the placement fields for a move/create. */
	const zonePlacement = useCallback(
		(zone: Zone): Placement | null => {
			switch (zone.kind) {
				case 'day':
					return {
						section: ProvisionSection.Day,
						day: new Date(zone.ownerId),
						tripOutfitId: null,
					};
				case 'outfit': {
					const outfit = outfitById.get(zone.ownerId);
					if (!outfit) return null;
					return {
						section: ProvisionSection.Day,
						day: outfit.day,
						tripOutfitId: outfit.id,
					};
				}
				case 'universal':
					return {
						section: ProvisionSection.Universal,
						day: null,
						tripOutfitId: null,
					};
				case 'backup':
					return {
						section: ProvisionSection.Backup,
						day: null,
						tripOutfitId: null,
					};
				default:
					return null;
			}
		},
		[outfitById],
	);

	const dayOf = useCallback(
		(zone: Zone): Date | null => {
			if (zone.kind === 'day') return new Date(zone.ownerId);
			if (zone.kind === 'outfit')
				return outfitById.get(zone.ownerId)?.day ?? null;
			return null;
		},
		[outfitById],
	);

	const onSortableDrop = useCallback(
		(drop: SortableDrop<BoardEntry>) => {
			// An outfit grouping reordered within / moved across days. Outfits live in
			// the day's single interleaved list, so the rank is computed against its
			// mixed neighbours (pieces + outfits) via the shared entryRank.
			if (drop.type === 'trip-outfit') {
				const rank = rankForNeighbors(drop.destItems, drop.index, entryRank);
				if (drop.sameZone) {
					void persist(
						() => changeTripOutfitOrder(drop.id, rank),
						'Reordered',
						'Could not reorder outfit',
					);
					return;
				}
				const day = dayOf(drop.toZone);
				if (!day) return;
				void persist(
					() => moveTripOutfitToDay(drop.id, { day, order: rank }),
					'Moved outfit',
					'Could not move outfit',
				);
				return;
			}

			// A clothing piece reordered within / moved between day/outfit/section zones.
			// In a day its neighbours can be outfits too, so rank against entryRank.
			const placement = zonePlacement(drop.toZone);
			if (!placement) return;
			const rank = rankForNeighbors(drop.destItems, drop.index, entryRank);
			if (drop.sameZone) {
				void persist(
					() => changeClothingProvisionDayOrder(drop.id, rank),
					'Reordered',
					'Could not reorder',
				);
			} else {
				void persist(
					() =>
						moveClothingProvision(drop.id, {
							section: placement.section,
							day: placement.day ?? undefined,
							tripOutfitId: placement.tripOutfitId ?? undefined,
							dayOrder: rank,
						}),
					'Moved',
					'Could not move piece',
				);
			}
		},
		[zonePlacement, dayOf, persist],
	);

	const onExternalDrop = useCallback(
		(drop: ExternalDrop) => {
			if (!drop.toZone) return;

			// An outfit TEMPLATE dragged from the closet materializes onto a day.
			if (drop.type === 'outfit') {
				const day = dayOf(drop.toZone);
				if (!day) return;
				void persist(
					() => assignOutfitToDays(trip.id, { outfitId: drop.id, days: [day] }),
					'Added outfit',
					'Could not add outfit',
				);
				return;
			}

			// A piece dragged out of the closet creates a brand-new provision.
			if (drop.fromZone.kind === 'closet') {
				const placement = zonePlacement(drop.toZone);
				if (!placement) return;
				void persist(
					() =>
						createClothingProvisions(trip.id, {
							clothingIds: [drop.id],
							section: placement.section,
							day: placement.day ?? undefined,
							tripOutfitId: placement.tripOutfitId ?? undefined,
						}),
					'Added piece',
					'Could not add piece',
				);
			}
		},
		[dayOf, outfitById, zonePlacement, persist, trip.id],
	);

	const { groups, write, props } = useDragBoard<BoardEntry>({
		groups: () => buildBoard(board, trip.id, days).groups,
		deps: [board],
		onSortableDrop,
		onExternalDrop,
	});

	const countById = useMemo(
		() => buildBoard(board, trip.id, days).countById,
		[board, trip.id, days],
	);

	// ——— reuse / bringing stats (server-derived; settle on refetch) ———
	const counts = useMemo(
		() => reuseCounts(board.clothingProvisions),
		[board.clothingProvisions],
	);

	const ownedById = useMemo(() => {
		const map = new Map<string, number>();
		for (const c of closet) map.set(c.id, c.quantity);
		return map;
	}, [closet]);

	const bringOverrides = useMemo<BringMap>(() => {
		const map: BringMap = new Map();
		for (const b of board.clothingBrings) map.set(b.clothingId, b.bringing);
		return map;
	}, [board.clothingBrings]);

	function bringingFor(clothingId: string): number {
		return effectiveBringing(
			bringOverrides,
			clothingId,
			ownedById.get(clothingId) ?? 1,
		);
	}

	// Reuse = total PLACEMENTS beyond what you're bringing (a piece worn on several
	// days/outfits). Counting distinct physical units instead would always read 0 for
	// day-reuse (one unit shared across days), so the badge never showed.
	function reuseBadgeFor(clothingId: string): number {
		return computeReuseCount(
			counts.get(clothingId) ?? 0,
			bringingFor(clothingId),
		);
	}

	function placeLabel(p: BoardProvision): string {
		if (p.tripOutfitId) {
			const name = outfitById.get(p.tripOutfitId)?.name ?? 'Outfit';
			return p.day ? `${name} · ${format(p.day, 'MMM d')}` : name;
		}
		if (p.section === ProvisionSection.Day && p.day)
			return format(p.day, 'EEE, MMM d');
		return p.section;
	}

	function placesFor(clothingId: string): ReactNode[] {
		return whereUsed(board.clothingProvisions, clothingId).map((p) =>
			placeLabel(p),
		);
	}

	// A piece deleted via its tile: drop it from the controlled groups immediately;
	// the delete already persisted + invalidated (DeletePieceButton).
	const handleRemovedPiece = useCallback(
		(id: string) => {
			write((g) => {
				const next: Record<string, BoardEntry[]> = {};
				for (const [k, arr] of Object.entries(g))
					next[k] = arr.filter((p) => p.id !== id);
				return next;
			});
		},
		[write],
	);

	const renderPiece = useCallback(
		(
			provision: BoardProvision,
			index: number,
			zone: Zone,
			size: ItemDisplaySize,
			stackCount = 1,
		) => (
			<PieceCard
				key={provision.id}
				tripId={trip.id}
				provision={provision}
				index={index}
				zone={zone}
				size={size}
				stackCount={stackCount}
				reuseCount={reuseBadgeFor(provision.clothingId)}
				provisionCount={counts.get(provision.clothingId) ?? 0}
				places={placesFor(provision.clothingId)}
				onRemoved={handleRemovedPiece}
			/>
		),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[trip.id, counts, bringOverrides, outfitById, handleRemovedPiece],
	);

	const buckets = useMemo(
		() => buildBuckets(days, groups, countById, board.dayNotes),
		[days, groups, countById, board.dayNotes],
	);

	const universal = (groups[encodeZone(universalZone(trip.id))] ??
		[]) as BoardProvision[];
	const backup = (groups[encodeZone(backupZone(trip.id))] ??
		[]) as BoardProvision[];

	return (
		<DragBoard {...props}>
			<DragAnnouncer />
			<div className="flex flex-col gap-6 md:flex-row md:items-start">
				<div className="flex min-w-0 flex-1 flex-col gap-6">
					{/* Keyed remount replays a lightweight CSS enter on view change — pure
					    CSS avoids AnimatePresence's exit/removeChild reconciliation issues
					    with React 19. */}
					<div
						key={view}
						className="animate-in fade-in-0 slide-in-from-bottom-1 duration-[var(--dur-fast)] ease-[var(--ease-out)]"
					>
						{view === ProvisionView.Calendar ? (
							<CalendarView
								tripId={trip.id}
								trip={trip}
								buckets={buckets}
								renderPiece={renderPiece}
								large={large}
							/>
						) : (
							<ListView
								tripId={trip.id}
								buckets={buckets}
								renderPiece={renderPiece}
								large={large}
							/>
						)}
					</div>

					<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
						<SectionLane
							tripId={trip.id}
							section="Universal"
							pieces={universal}
							renderPiece={renderPiece}
							large={large}
						/>
						<SectionLane
							tripId={trip.id}
							section="Backup"
							pieces={backup}
							renderPiece={renderPiece}
							large={large}
						/>
					</div>
				</div>

				{/* Docked closet: a fixed sidebar column on md+ (sticky, own scroll),
				    a full-width stacked panel on mobile. Collapses to zero width. */}
				<div
					aria-hidden={!closetOpen}
					className={cn(
						'shrink-0 overflow-hidden transition-[width,opacity] duration-[var(--dur-drawer)] ease-[var(--ease-drawer)] md:sticky md:top-[4.75rem] md:self-start',
						closetOpen
							? 'w-full opacity-100 md:h-[calc(100svh-6.25rem)] md:w-72 lg:w-80'
							: 'hidden md:block md:w-0 md:pointer-events-none md:opacity-0 md:invisible',
					)}
				>
					<div className="h-full w-full md:w-72 lg:w-80">
						<ClosetSidebar
							tripId={trip.id}
							clothing={closet}
							outfits={outfits}
							placed={counts}
							bringOverrides={bringOverrides}
							onClose={toggleCloset}
						/>
					</div>
				</div>
			</div>
		</DragBoard>
	);
}

function ListView({
	tripId,
	buckets,
	renderPiece,
	large,
}: {
	tripId: string;
	buckets: DayBucket[];
	renderPiece: Parameters<typeof DayColumn>[0]['renderPiece'];
	large: boolean;
}) {
	return (
		<div className="flex flex-col gap-3">
			{buckets.map((bucket) => (
				<DayColumn
					key={bucket.day.toISOString()}
					tripId={tripId}
					bucket={bucket}
					variant="list"
					renderPiece={renderPiece}
					large={large}
				/>
			))}
		</div>
	);
}

function CalendarView({
	tripId,
	trip,
	buckets,
	renderPiece,
	large,
}: {
	tripId: string;
	trip: Pick<Trip, 'start' | 'end'>;
	buckets: DayBucket[];
	renderPiece: Parameters<typeof DayColumn>[0]['renderPiece'];
	large: boolean;
}) {
	const byKey = new Map(buckets.map((b) => [b.key, b]));
	const weeks = eachWeekOfInterval(
		{ start: trip.start, end: trip.end },
		{ weekStartsOn: 0 },
	);
	const interval = { start: startOfDay(trip.start), end: startOfDay(trip.end) };

	return (
		<div
			data-testid="calendar-grid"
			className="-mx-1 overflow-x-auto px-1 pb-1"
		>
			<div className="flex flex-col gap-3 md:min-w-[52rem]">
				<div className="hidden grid-cols-7 gap-2 px-1 md:grid">
					{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
						<div
							key={d}
							className="text-muted-foreground text-center text-xs font-semibold tracking-wide uppercase"
						>
							{d}
						</div>
					))}
				</div>
				{weeks.map((weekStart) => {
					const weekDays = eachDayOfInterval({
						start: weekStart,
						end: addDays(weekStart, 6),
					});
					return (
						<div
							key={weekStart.toISOString()}
							className="flex flex-col gap-2 md:grid md:grid-cols-7 md:items-stretch"
						>
							{weekDays.map((day) => {
								const inTrip = isWithinInterval(startOfDay(day), interval);
								const bucket = byKey.get(dayKey(day)) ?? emptyBucket(day);
								return (
									<DayColumn
										key={day.toISOString()}
										tripId={tripId}
										bucket={bucket}
										variant="calendar"
										renderPiece={renderPiece}
										muted={!inTrip}
										large={large}
									/>
								);
							})}
						</div>
					);
				})}
			</div>
		</div>
	);
}

// ——— helpers ———

/** Canonical per-day key: every day reference is normalized to local midnight. */
function dayKey(date: Date): string {
	return startOfDay(date).toISOString();
}

/**
 * Collapse same-clothing duplicates within one bucket into a single stack: the first
 * (lowest-rank) provision represents the stack, the rest become a ×N count. The input
 * must already be rank-sorted so the representative is stable.
 */
function stackPieces(sorted: BoardProvision[]): PieceStack[] {
	const stacks: PieceStack[] = [];
	const byClothing = new Map<string, PieceStack>();
	for (const p of sorted) {
		const existing = byClothing.get(p.clothingId);
		if (existing) {
			existing.count += 1;
		} else {
			const stack: PieceStack = { rep: p, count: 1 };
			byClothing.set(p.clothingId, stack);
			stacks.push(stack);
		}
	}
	return stacks;
}

/** Project the controlled groups + counts into the DayBucket shape DayColumn renders. */
function buildBuckets(
	days: Date[],
	groups: Record<string, BoardEntry[]>,
	countById: Map<string, number>,
	notes: TripClothingBoard['dayNotes'],
): DayBucket[] {
	const noteByDay = new Map(notes.map((n) => [dayKey(n.day), n.note]));
	const toStacks = (reps: BoardEntry[]): PieceStack[] =>
		reps
			.filter((e): e is BoardProvision => !isDayOutfit(e))
			.map((rep) => ({ rep, count: countById.get(rep.id) ?? 1 }));

	return days.map((day) => {
		const key = dayKey(day);
		// The day's single interleaved list: pieces and outfits in their live order.
		const entries: DayEntry[] = (groups[encodeZone(dayZone(key))] ?? []).map(
			(e) =>
				isDayOutfit(e)
					? {
							kind: 'outfit' as const,
							outfit: e,
							pieces: toStacks(groups[encodeZone(outfitZone(e.id))] ?? []),
						}
					: {
							kind: 'piece' as const,
							stack: { rep: e, count: countById.get(e.id) ?? 1 },
						},
		);
		return { day, key, note: noteByDay.get(key) ?? '', entries };
	});
}

function emptyBucket(day: Date): DayBucket {
	return { day, key: dayKey(day), note: '', entries: [] };
}
