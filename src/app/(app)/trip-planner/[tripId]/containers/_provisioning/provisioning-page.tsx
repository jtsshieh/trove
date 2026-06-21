import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { getQueryClient } from '@/lib/query-client';

import ContainersLoading from '../loading';
import { ContainerBoardContent } from './page-wrapper';
import { getContainerBoardData } from './_data/fetchers';
import { containerBoardKeys } from './_data/queries';

export function ProvisioningPage({ tripId }: { tripId: string }) {
	return (
		<Suspense fallback={<ContainersLoading />}>
			<ContainerData tripId={tripId} />
		</Suspense>
	);
}

/**
 * Streams the board: the page shell paints immediately while this server component
 * prefetches into the query cache (using the direct DB loader as the queryFn) and
 * hands the dehydrated cache to the client. The client board reads from that cache
 * via useSuspenseQuery — it never calls its own fetch queryFn during initial render.
 */
async function ContainerData({ tripId }: { tripId: string }) {
	const queryClient = getQueryClient();
	const [data] = await Promise.all([
		getContainerBoardData(tripId),
		queryClient.prefetchQuery({
			queryKey: containerBoardKeys.board(tripId),
			queryFn: () => getContainerBoardData(tripId),
		}),
	]);

	if (!data) return notFound();

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<ContainerBoardContent tripId={tripId} />
		</HydrationBoundary>
	);
}
