'use client';

import { Plus, Shirt } from 'lucide-react';
import { type ReactNode } from 'react';
import { format, isToday } from 'date-fns';

import { DropZone } from '@/components/dnd';
import { Button } from '@/components/ui/button';
import type { ItemDisplaySize } from '@/components/ui/item-display';
import type { Zone } from '@/lib/dnd/zone';
import { cn } from '@/lib/utils';

import { useCreateAdHocTripOutfit } from '../_data/mutations';
import { DayNoteField } from './day-note-field';
import { OutfitGroup } from './outfit-group';
import type { BoardOutfit, BoardProvision } from './types';

/**
 * The same clothing provisioned multiple times on one day (or one outfit) collapses
 * into a single stack: one tile (the representative provision) with a ×N badge.
 * Dragging the tile still moves one unit; the rest stay put as the count.
 */
export interface PieceStack {
	rep: BoardProvision;
	count: number;
}

export interface DayBucket {
	day: Date;
	/** Canonical day key (local-midnight ISO) shared with the board's zone ids. */
	key: string;
	note: string;
	loose: PieceStack[];
	outfits: { outfit: BoardOutfit; pieces: PieceStack[] }[];
}

/**
 * One day on the board (shared by the list and calendar views). Shows the date,
 * an inline note, each outfit grouping, then the loose pieces — every region a
 * drop target. `variant` tunes the chrome and piece size for calendar vs list.
 */
export function DayColumn({
	tripId,
	bucket,
	variant,
	renderPiece,
	muted,
	large,
}: {
	tripId: string;
	bucket: DayBucket;
	variant: 'calendar' | 'list';
	renderPiece: (
		provision: BoardProvision,
		index: number,
		zone: Zone,
		size: ItemDisplaySize,
		stackCount?: number,
	) => ReactNode;
	muted?: boolean;
	/** "Large" piece-size mode: prominent picture-on-top cards in a fill grid. */
	large?: boolean;
}) {
	const { day, key, note, loose, outfits } = bucket;
	const looseZone: Zone = { kind: 'day', ownerId: key };
	// Large mode renders prominent vertical cards in both views; otherwise the
	// calendar stays image-forward (calendar-box) and the list stays inline chips.
	const pieceSize: ItemDisplaySize = large
		? 'card'
		: variant === 'calendar'
			? 'calendar-box'
			: 'chip';
	const isEmpty = loose.length === 0 && outfits.length === 0;
	const today = isToday(day);

	const isCalendar = variant === 'calendar';
	// Pieces that flow in a fill grid (image-forward): calendar always, plus the
	// list view when Large mode turns its inline chips into picture cards.
	const gridPieces = isCalendar || large;

	if (muted) {
		// Out-of-trip padding cell — only meaningful in the md+ grid layout, where
		// it keeps weekday alignment. Hidden in the narrow stacked layout.
		return (
			<div className="border-border/60 bg-panel/30 hidden min-h-24 rounded-xl border border-dashed md:block" />
		);
	}

	return (
		<div
			data-testid="day-column"
			data-day={format(day, 'yyyy-MM-dd')}
			className="h-full"
		>
			{/* The WHOLE day card is the drop zone (date, note, outfits, loose pieces),
			    so a piece can be dropped anywhere on the day — outfit groups nested
			    inside still capture their own drops. */}
			<DropZone
				zone={looseZone}
				accepts={['clothing', 'outfit', 'trip-outfit']}
				className={cn(
					'flex h-full flex-col gap-2 rounded-xl bg-panel p-2 transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)]',
					variant === 'list' && 'p-3',
					isCalendar && today && 'ring-1 ring-foreground/25',
					'data-[drop-target]:bg-brand-subtle',
				)}
			>
				<div className="flex items-baseline justify-between gap-2 px-0.5">
				<div className="flex items-baseline gap-1.5">
					<span
						className={cn(
							'text-xs font-semibold tracking-wide uppercase',
							today ? 'text-brand' : 'text-muted-foreground',
						)}
					>
						{format(day, 'EEE')}
					</span>
					<span
						className={cn(
							'font-semibold tabular-nums',
							isCalendar ? 'text-sm md:text-base' : 'text-base',
							today && 'text-brand',
						)}
					>
						{/* Stacked (narrow) calendar cells show the full date like the
						    list; the md+ grid shows just the day number to stay compact. */}
						{isCalendar ? (
							<>
								<span className="md:hidden">{format(day, 'MMM d')}</span>
								<span className="hidden md:inline">{format(day, 'd')}</span>
							</>
						) : (
							format(day, 'MMM d')
						)}
					</span>
				</div>
				<AddOutfitButton tripId={tripId} day={day} />
			</div>

			<DayNoteField tripId={tripId} day={day} note={note} />

				{/* Loose content fills the rest of the day card (which IS the drop zone),
				    so the empty space below is droppable too. */}
				<div className="flex flex-1 flex-col gap-1.5">
					{outfits.map(({ outfit, pieces }) => {
					const zone: Zone = { kind: 'outfit', ownerId: outfit.id };
					return (
						<OutfitGroup
							key={outfit.id}
							outfit={outfit}
							zone={zone}
							count={pieces.length}
							grid={gridPieces}
						>
							{pieces.map((s, i) =>
								renderPiece(s.rep, i, zone, pieceSize, s.count),
							)}
						</OutfitGroup>
					);
				})}

				{/* Loose pieces flow in a fill grid (image-forward) or a stack (compact).
				    The empty placeholder renders as ONE cell INSIDE this grid so it stays
				    tile-sized in every mode (it ballooned to a full-width square before),
				    and the day's height barely shifts when the first piece lands. */}
				{(isEmpty || loose.length > 0) && (
					<div
						className={cn(
							gridPieces
								? large
									? 'grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-2'
									: 'grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-1.5'
								: 'flex flex-col gap-1',
						)}
					>
						{isEmpty ? (
							<EmptyTile size={pieceSize} />
						) : (
							loose.map((s, i) =>
								renderPiece(s.rep, i, looseZone, pieceSize, s.count),
							)
						)}
					</div>
				)}
				</div>
			</DropZone>
		</div>
	);
}

/**
 * An empty-day placeholder sized like ONE tile so the day's height barely changes
 * when the first piece lands (minimal layout shift). Mirrors the tile box per size:
 * image-forward = a square photo slot + label; compact = a chip-height row.
 */
function EmptyTile({ size }: { size: ItemDisplaySize }) {
	const imageForward = size === 'calendar-box' || size === 'card';
	if (imageForward) {
		return (
			<div
				data-testid="day-empty"
				className="border-border flex flex-col gap-1 rounded-lg border border-dashed p-1.5 text-center"
			>
				<div className="bg-muted/30 text-muted-foreground/40 flex aspect-square w-full items-center justify-center rounded-lg">
					<Shirt className="size-1/3" />
				</div>
				<span className="text-muted-foreground/60 text-xs leading-tight">
					Nothing yet
				</span>
			</div>
		);
	}
	return (
		<div
			data-testid="day-empty"
			className="border-border flex items-center gap-2.5 rounded-lg border border-dashed p-1"
		>
			<div className="bg-muted/30 text-muted-foreground/40 flex size-10 shrink-0 items-center justify-center rounded-lg">
				<Shirt className="size-1/2" />
			</div>
			<span className="text-muted-foreground/60 text-sm">Nothing yet</span>
		</div>
	);
}

function AddOutfitButton({ tripId, day }: { tripId: string; day: Date }) {
	const createOutfit = useCreateAdHocTripOutfit(tripId);
	return (
		<Button
			size="xs"
			variant="ghost"
			loading={createOutfit.isPending}
			onClick={() => {
				void createOutfit.mutateAsync({ day });
			}}
			className="text-muted-foreground hover:text-brand -mr-1 shrink-0"
		>
			{!createOutfit.isPending && <Plus />}
			Outfit
		</Button>
	);
}
