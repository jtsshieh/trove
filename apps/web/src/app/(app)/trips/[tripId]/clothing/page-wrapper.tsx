'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import {
	CalendarDays,
	LayoutGrid,
	List as ListIcon,
	Rows3,
	Shirt,
} from 'lucide-react';

import { DisplayToggle } from '@/components/display-mode';
import { Segmented } from '@/components/segmented';
import { Button } from '@/components/ui/button';
import { PieceSize, ProvisionView } from '@/generated/prisma/enums';
import { cn } from '@/lib/utils';

import { useClothingBoardControls } from './board-controls';
import { ClothingBoard } from './clothing-board';
import { clothingBoardQueryOptions } from './_data/queries';

/**
 * The clothing board header actions — the closet toggle, list/calendar + piece-size
 * segments and the display toggle. They drive the same view-level state the board
 * reads (via ClothingBoardControlsProvider), so the header and board stay in lock
 * step even though they render in separate Suspense boundaries. No board data is
 * required, so these paint as soon as the controls context is mounted.
 */
export function ClothingBoardActions() {
	const {
		view,
		changeView,
		pieceSize,
		changePieceSize,
		closetOpen,
		toggleCloset,
	} = useClothingBoardControls();

	return (
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
					{
						value: ProvisionView.List,
						icon: <ListIcon />,
						title: 'List',
					},
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
	);
}

/**
 * Reads the dehydrated board cache (provisions, outfits, notes, closet, brings,
 * templates) and feeds the board island. Board mutations invalidate this query so
 * the whole board re-derives from one refetch — no prop-drilled server snapshot.
 */
export function ClothingBoardContent({ tripId }: { tripId: string }) {
	const { data } = useSuspenseQuery(clothingBoardQueryOptions(tripId));
	const { board, closet, outfits } = data;

	return (
		<ClothingBoard
			trip={{ id: board.id, start: board.start, end: board.end }}
			board={board}
			closet={closet}
			outfits={outfits}
		/>
	);
}
