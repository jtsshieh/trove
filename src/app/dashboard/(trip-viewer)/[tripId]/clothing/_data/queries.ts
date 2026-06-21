import { queryOptions } from '@tanstack/react-query';

import { fetchClothingBoard } from './api';

/** Per-trip board query key — every board mutation invalidates exactly this trip's cache. */
export const clothingBoardKeys = {
	board: (tripId: string) => ['trip-clothing-board', tripId] as const,
};

export const clothingBoardQueryOptions = (tripId: string) =>
	queryOptions({
		queryKey: clothingBoardKeys.board(tripId),
		queryFn: () => fetchClothingBoard(tripId),
	});
