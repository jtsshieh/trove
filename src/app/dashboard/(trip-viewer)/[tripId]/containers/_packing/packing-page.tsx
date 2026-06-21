import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { getQueryClient } from '@/lib/query-client';

import ContainersLoading from '../loading';
import { ContainerPackingContent } from './page-wrapper';
import { getContainerPackingBoard } from './_data/fetchers';
import { containerPackingBoardKeys } from './_data/queries';

export function PackingPage({ tripId }: { tripId: string }) {
	return (
		<Suspense fallback={<ContainersLoading />}>
			<ContainerPackingData tripId={tripId} />
		</Suspense>
	);
}

/**
 * Streams the board: the page shell paints immediately while this server component
 * prefetches into the query cache (using the direct DB loader as the queryFn) and
 * hands the dehydrated cache to the client. The client board reads from that cache
 * via useSuspenseQuery — it never calls its own fetch queryFn during initial render.
 */
async function ContainerPackingData({ tripId }: { tripId: string }) {
	const queryClient = getQueryClient();
	const [data] = await Promise.all([
		getContainerPackingBoard(tripId),
		queryClient.prefetchQuery({
			queryKey: containerPackingBoardKeys.board(tripId),
			queryFn: () => getContainerPackingBoard(tripId),
		}),
	]);

	if (!data) return notFound();

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<ContainerPackingContent tripId={tripId} />
		</HydrationBoundary>
	);
}
