import { queryOptions } from '@tanstack/react-query';

import { fetchEssentialsBoard } from './api';

/** Per-trip board query key — every board mutation invalidates exactly this trip's cache. */
export const essentialsBoardKeys = {
	board: (tripId: string) => ['trip-essentials-board', tripId] as const,
};

export const essentialsBoardQueryOptions = (tripId: string) =>
	queryOptions({
		queryKey: essentialsBoardKeys.board(tripId),
		queryFn: () => fetchEssentialsBoard(tripId),
	});
