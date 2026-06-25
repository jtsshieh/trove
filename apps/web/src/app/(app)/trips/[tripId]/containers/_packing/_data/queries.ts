import { queryOptions } from '@tanstack/react-query';

import { fetchContainerPackingBoard } from './api';

/** Per-trip board query key — every packing toggle invalidates exactly this trip's cache. */
export const containerPackingBoardKeys = {
	board: (tripId: string) => ['trip-container-packing-board', tripId] as const,
};

export const containerPackingBoardQueryOptions = (tripId: string) =>
	queryOptions({
		queryKey: containerPackingBoardKeys.board(tripId),
		queryFn: () => fetchContainerPackingBoard(tripId),
	});
