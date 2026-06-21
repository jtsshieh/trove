import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { getUserSettings } from '@/app/dashboard/(main)/account/_data/fetchers';
import { getQueryClient } from '@/lib/query-client';

import ClothingLoading from './loading';
import { ClothingBoardContent } from './page-wrapper';
import { getClothingBoardData } from './_data/fetchers';
import { clothingBoardKeys } from './_data/queries';

export default async function ClothingPage(props: {
	params: Promise<{ tripId: string }>;
}) {
	const { tripId } = await props.params;

	return (
		<Suspense fallback={<ClothingLoading />}>
			<ClothingData tripId={tripId} />
		</Suspense>
	);
}

/**
 * Streams the board: the page shell paints immediately while this server component
 * prefetches into the query cache (using the direct DB loader as the queryFn) and
 * hands the dehydrated cache to the client. The client board reads from that cache
 * via useSuspenseQuery — it never calls its own fetch queryFn during initial render.
 */
async function ClothingData({ tripId }: { tripId: string }) {
	const queryClient = getQueryClient();
	const [data, settings] = await Promise.all([
		getClothingBoardData(tripId),
		getUserSettings(),
		queryClient.prefetchQuery({
			queryKey: clothingBoardKeys.board(tripId),
			queryFn: () => getClothingBoardData(tripId),
		}),
	]);

	if (!data) return notFound();

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<ClothingBoardContent
				tripId={tripId}
				initialView={settings.defaultProvisionView}
				initialPieceSize={settings.pieceSize}
			/>
		</HydrationBoundary>
	);
}
