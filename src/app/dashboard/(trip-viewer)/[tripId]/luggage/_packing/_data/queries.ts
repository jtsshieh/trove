import { queryOptions } from '@tanstack/react-query';

import { fetchLuggagePackingBoard } from './api';

/** Per-trip board query key — every board mutation invalidates exactly this trip's cache. */
export const luggagePackingBoardKeys = {
	board: (tripId: string) => ['trip-luggage-packing-board', tripId] as const,
};

export const luggagePackingBoardQueryOptions = (tripId: string) =>
	queryOptions({
		queryKey: luggagePackingBoardKeys.board(tripId),
		queryFn: () => fetchLuggagePackingBoard(tripId),
	});
