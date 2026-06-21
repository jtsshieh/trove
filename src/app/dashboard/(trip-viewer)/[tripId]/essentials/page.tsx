import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { getQueryClient } from '@/lib/query-client';

import EssentialsLoading from './loading';
import { EssentialsBoardContent } from './page-wrapper';
import { getEssentialsBoardData } from './_data/fetchers';
import { essentialsBoardKeys } from './_data/queries';

export default async function EssentialsPage(props: {
	params: Promise<{ tripId: string }>;
}) {
	const { tripId } = await props.params;

	return (
		<Suspense fallback={<EssentialsLoading />}>
			<EssentialsData tripId={tripId} />
		</Suspense>
	);
}

/**
 * Streams the board: the page shell paints immediately while this server component
 * prefetches into the query cache (using the direct DB loader as the queryFn) and
 * hands the dehydrated cache to the client. The client board reads from that cache
 * via useSuspenseQuery — it never calls its own fetch queryFn during initial render.
 */
async function EssentialsData({ tripId }: { tripId: string }) {
	const queryClient = getQueryClient();
	const [data] = await Promise.all([
		getEssentialsBoardData(tripId),
		queryClient.prefetchQuery({
			queryKey: essentialsBoardKeys.board(tripId),
			queryFn: () => getEssentialsBoardData(tripId),
		}),
	]);

	if (!data) return notFound();

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<EssentialsBoardContent tripId={tripId} />
		</HydrationBoundary>
	);
}
