'use client';

import {
	CalendarDays,
	LayoutGrid,
	List as ListIcon,
	Rows3,
	Shirt,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
	startTransition,
	useCallback,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react';
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
import { DisplayToggle } from '@/components/display-mode';
import { Button } from '@/components/ui/button';
import { type ItemDisplaySize } from '@/components/ui/item-display';
import { Segmented } from '@/components/segmented';
import { updateUserSettings } from '@/app/dashboard/(main)/account/_data/api';
import { TripPageHeader } from '@/app/dashboard/(trip-viewer)/[tripId]/_components/trip-page-header';
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
	distinctUnits,
	effectiveBringing,
	reuseCount as computeReuseCount,
	reuseCounts,
	whereUsed,
	type BringMap,
	type PlacementLike,
} from '@/lib/reuse';
import { cn } from '@/lib/utils';

import {
	assignOutfitToDays,
	changeClothingProvisionDayOrder,
	createClothingProvisions,
	moveClothingProvision,
	moveTripOutfitToDay,
} from './_data/api';
import { clothingBoardKeys } from './_data/queries';
import type { TripClothingBoard } from './_data/fetchers';
import type { OutfitWithItems } from '@/app/dashboard/(main)/outfits/_data/fetchers';
import { ClosetSidebar } from './_components/closet-panel';
import {
	DayColumn,
	type DayBucket,
	type PieceStack,
} from './_components/day-column';
import { SectionLane } from './_components/section-lane';
import { PieceCard } from './_components/piece-card';
import type { BoardOutfit, BoardProvision } from './_components/types';

type ClosetClothing = Clothing & { type: { name: string; category: string } };

const CLOSET_PREF = 'pkl:clothing-closet';

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
): { groups: Record<string, BoardProvision[]>; countById: Map<string, number> } {
	const provisions = board.clothingProvisions;
	const groups: Record<string, BoardProvision[]> = {};
	const countById = new Map<string, number>();

	const dedupe = (list: BoardProvision[], zone: Zone) => {
		const stacks = stackPieces(sortByRank(list, (p) => p.dayOrder));
		groups[encodeZone(zone)] = stacks.map((s) => s.rep);
		for (const s of stacks) countById.set(s.rep.id, s.count);
	};

	for (const day of days) {
		const key = dayKey(day);
		dedupe(
			provisions.filter(
				(p) =>
					!p.tripOutfitId &&
					p.section === ProvisionSection.Day &&
					!!p.day &&
					dayKey(p.day) === key,
			),
			dayZone(key),
		);
	}
	for (const outfit of board.tripOutfits) {
		dedupe(
			provisions.filter((p) => p.tripOutfitId === outfit.id),
			outfitZone(outfit.id),
		);
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
	initialView,
	initialPieceSize,
}: {
	trip: Pick<Trip, 'id' | 'start' | 'end'>;
	board: TripClothingBoard;
	closet: ClosetClothing[];
	outfits: OutfitWithItems[];
	initialView: ProvisionView;
	initialPieceSize: PieceSize;
}) {
	const queryClient = useQueryClient();
	const router = useRouter();
	const [view, setView] = useState<ProvisionView>(initialView);
	const [pieceSize, setPieceSize] = useState<PieceSize>(initialPieceSize);
	const large = pieceSize === PieceSize.Large;
	// The closet docks as a toggleable sidebar, closed by default so the board
	// (especially the 7-column calendar) gets full width. We restore a previously
	// opened preference after mount (initial render is closed on both server +
	// client → no hydration mismatch).
	const [closetOpen, setClosetOpen] = useState(false);
	useEffect(() => {
		if (localStorage.getItem(CLOSET_PREF) === 'open') setClosetOpen(true);
	}, []);
	function toggleCloset() {
		setClosetOpen((open) => {
			localStorage.setItem(CLOSET_PREF, open ? 'closed' : 'open');
			return !open;
		});
	}

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
			if (zone.kind === 'outfit') return outfitById.get(zone.ownerId)?.day ?? null;
			return null;
		},
		[outfitById],
	);

	const onSortableDrop = useCallback(
		(drop: SortableDrop<BoardProvision>) => {
			const placement = zonePlacement(drop.toZone);
			if (!placement) return;
			const rank = rankForNeighbors(drop.destItems, drop.index, (p) => p.dayOrder);
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
		[zonePlacement, persist],
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

			// A whole TripOutfit grouping dragged onto another day moves it there.
			if (drop.type === 'trip-outfit') {
				const day = dayOf(drop.toZone);
				if (!day) return;
				const outfit = outfitById.get(drop.id);
				if (!outfit || dayKey(outfit.day) === dayKey(day)) return;
				void persist(
					() => moveTripOutfitToDay(drop.id, { day }),
					'Moved outfit',
					'Could not move outfit',
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

	const { groups, write, props } = useDragBoard<BoardProvision>({
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

	// Distinct physical units each clothing consumes, honoring the day-reuse rule
	// (one unit shared across days, but Universal/Backup each take their own).
	const distinctById = useMemo(() => {
		const byClothing = new Map<string, PlacementLike[]>();
		for (const p of board.clothingProvisions) {
			const list = byClothing.get(p.clothingId) ?? [];
			list.push({ section: p.section, dayKey: p.day ? dayKey(p.day) : null });
			byClothing.set(p.clothingId, list);
		}
		const map = new Map<string, number>();
		for (const [clothingId, placements] of byClothing)
			map.set(clothingId, distinctUnits(placements));
		return map;
	}, [board.clothingProvisions]);

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
		return computeReuseCount(counts.get(clothingId) ?? 0, bringingFor(clothingId));
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
				const next: Record<string, BoardProvision[]> = {};
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
		[trip.id, counts, distinctById, bringOverrides, outfitById, handleRemovedPiece],
	);

	const buckets = useMemo(
		() => buildBuckets(days, groups, countById, board.tripOutfits, board.dayNotes),
		[days, groups, countById, board.tripOutfits, board.dayNotes],
	);

	const universal = groups[encodeZone(universalZone(trip.id))] ?? [];
	const backup = groups[encodeZone(backupZone(trip.id))] ?? [];

	function changeView(next: ProvisionView) {
		setView(next);
		startTransition(async () => {
			await updateUserSettings({ defaultProvisionView: next });
			router.refresh();
		});
	}

	function changePieceSize(next: PieceSize) {
		setPieceSize(next);
		startTransition(async () => {
			await updateUserSettings({ pieceSize: next });
			router.refresh();
		});
	}

	return (
		<DragBoard {...props}>
			<DragAnnouncer />
			<TripPageHeader
				icon={<Shirt />}
				title="Clothing"
				description={`${format(trip.start, 'MMM d')} – ${format(trip.end, 'MMM d')}`}
				actions={
					<>
						<Button
							variant="outline"
							size="sm"
							onClick={toggleCloset}
							aria-pressed={closetOpen}
							className={cn(
								closetOpen &&
									'border-brand bg-brand-subtle text-brand hover:bg-brand-subtle hover:text-brand',
							)}
						>
							<Shirt />
							Closet
						</Button>
						<Segmented
							value={view}
							onValueChange={changeView}
							options={[
								{ value: ProvisionView.List, icon: <ListIcon />, title: 'List' },
								{
									value: ProvisionView.Calendar,
									icon: <CalendarDays />,
									title: 'Calendar',
								},
							]}
						/>
						<Segmented
							value={pieceSize}
							onValueChange={changePieceSize}
							options={[
								{
									value: PieceSize.Compact,
									icon: <Rows3 />,
									title: 'Compact pieces',
								},
								{
									value: PieceSize.Large,
									icon: <LayoutGrid />,
									title: 'Large pieces',
								},
							]}
						/>
						<DisplayToggle />
					</>
				}
			/>

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
							placed={distinctById}
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
		<div data-testid="calendar-grid" className="-mx-1 overflow-x-auto px-1 pb-1">
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
	groups: Record<string, BoardProvision[]>,
	countById: Map<string, number>,
	outfits: BoardOutfit[],
	notes: TripClothingBoard['dayNotes'],
): DayBucket[] {
	const noteByDay = new Map(notes.map((n) => [dayKey(n.day), n.note]));
	const toStacks = (reps: BoardProvision[]): PieceStack[] =>
		reps.map((rep) => ({ rep, count: countById.get(rep.id) ?? 1 }));

	return days.map((day) => {
		const key = dayKey(day);
		const loose = toStacks(groups[encodeZone(dayZone(key))] ?? []);
		const dayOutfits = outfits
			.filter((o) => dayKey(o.day) === key)
			.sort((a, b) => a.order.localeCompare(b.order))
			.map((outfit) => ({
				outfit,
				pieces: toStacks(groups[encodeZone(outfitZone(outfit.id))] ?? []),
			}));
		return {
			day,
			key,
			note: noteByDay.get(key) ?? '',
			loose,
			outfits: dayOutfits,
		};
	});
}

function emptyBucket(day: Date): DayBucket {
	return { day, key: dayKey(day), note: '', loose: [], outfits: [] };
}
