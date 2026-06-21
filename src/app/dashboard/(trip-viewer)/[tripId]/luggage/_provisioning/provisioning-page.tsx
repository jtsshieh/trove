import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { getQueryClient } from '@/lib/query-client';

import LuggageProvisioningLoading from './loading';
import { LuggageProvisioningContent } from './page-wrapper';
import { getLuggageProvisioningBoard } from './_data/fetchers';
import { luggageBoardKeys } from './_data/queries';

export function ProvisioningPage({ tripId }: { tripId: string }) {
	return (
		<Suspense fallback={<LuggageProvisioningLoading />}>
			<ProvisioningData tripId={tripId} />
		</Suspense>
	);
}

/**
 * Streams the board: the page shell paints immediately while this server component
 * prefetches into the query cache (using the direct DB loader as the queryFn) and
 * hands the dehydrated cache to the client. The client board reads from that cache
 * via useSuspenseQuery — it never calls its own fetch queryFn during initial render.
 */
async function ProvisioningData({ tripId }: { tripId: string }) {
	const queryClient = getQueryClient();
	const [data] = await Promise.all([
		getLuggageProvisioningBoard(tripId),
		queryClient.prefetchQuery({
			queryKey: luggageBoardKeys.board(tripId),
			queryFn: () => getLuggageProvisioningBoard(tripId),
		}),
	]);

	if (!data) return notFound();

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<LuggageProvisioningContent tripId={tripId} />
		</HydrationBoundary>
	);
}
