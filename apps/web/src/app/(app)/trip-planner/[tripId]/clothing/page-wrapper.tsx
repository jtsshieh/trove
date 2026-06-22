'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

import { PieceSize, ProvisionView } from '@/generated/prisma/enums';

import { ClothingBoard } from './clothing-board';
import { clothingBoardQueryOptions } from './_data/queries';

/**
 * Reads the dehydrated board cache (provisions, outfits, notes, closet, brings,
 * templates) and feeds the board island. Board mutations invalidate this query so
 * the whole board re-derives from one refetch — no prop-drilled server snapshot.
 */
export function ClothingBoardContent({
	tripId,
	initialView,
	initialPieceSize,
}: {
	tripId: string;
	initialView: ProvisionView;
	initialPieceSize: PieceSize;
}) {
	const { data } = useSuspenseQuery(clothingBoardQueryOptions(tripId));
	const { board, closet, outfits } = data;

	return (
		<ClothingBoard
			trip={{ id: board.id, start: board.start, end: board.end }}
			board={board}
			closet={closet}
			outfits={outfits}
			initialView={initialView}
			initialPieceSize={initialPieceSize}
		/>
	);
}
