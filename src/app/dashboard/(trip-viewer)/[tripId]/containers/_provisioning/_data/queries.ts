import { queryOptions } from '@tanstack/react-query';

import { fetchContainerBoard } from './api';

/** Per-trip board query key — every board mutation invalidates exactly this trip's cache. */
export const containerBoardKeys = {
	board: (tripId: string) => ['trip-container-board', tripId] as const,
};

export const containerBoardQueryOptions = (tripId: string) =>
	queryOptions({
		queryKey: containerBoardKeys.board(tripId),
		queryFn: () => fetchContainerBoard(tripId),
	});
