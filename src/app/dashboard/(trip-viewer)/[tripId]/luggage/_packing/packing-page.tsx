import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import React, { Suspense } from 'react';

import { getQueryClient } from '@/lib/query-client';

import LuggageLoading from '../loading';
import { getLuggagePackingBoard } from './_data/fetchers';
import { luggagePackingBoardKeys } from './_data/queries';
import { LuggagePackingContent } from './page-wrapper';

export function PackingPage({ tripId }: { tripId: string }) {
	return (
		<Suspense fallback={<LuggageLoading />}>
			<PackingData tripId={tripId} />
		</Suspense>
	);
}

/**
 * Streams the board: the page shell paints immediately while this server component
 * prefetches into the query cache (using the direct DB loader as the queryFn) and
 * hands the dehydrated cache to the client. The client island reads from that cache
 * via useSuspenseQuery — it never calls its own fetch queryFn during initial render.
 */
async function PackingData({ tripId }: { tripId: string }) {
	const queryClient = getQueryClient();
	const [trip] = await Promise.all([
		getLuggagePackingBoard(tripId),
		queryClient.prefetchQuery({
			queryKey: luggagePackingBoardKeys.board(tripId),
			queryFn: () => getLuggagePackingBoard(tripId),
		}),
	]);

	if (!trip) return notFound();

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<LuggagePackingContent tripId={tripId} />
		</HydrationBoundary>
	);
}
