import { queryOptions } from '@tanstack/react-query';

import { fetchLuggageBoard } from './api';

/** Per-trip board query key — every board mutation invalidates exactly this trip's cache. */
export const luggageBoardKeys = {
	board: (tripId: string) => ['trip-luggage-board', tripId] as const,
};

export const luggageBoardQueryOptions = (tripId: string) =>
	queryOptions({
		queryKey: luggageBoardKeys.board(tripId),
		queryFn: () => fetchLuggageBoard(tripId),
	});
