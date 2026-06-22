import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Box } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { getQueryClient } from '@/lib/query-client';

import { BoardGridSkeleton } from '../../_components/board-skeletons';
import { TripPageHeader } from '../../_components/trip-page-header';
import {
	ContainerPackingActions,
	ContainerPackingContent,
} from './page-wrapper';
import { getContainerPackingBoard } from './_data/fetchers';
import { containerPackingBoardKeys } from './_data/queries';

/**
 * The static header paints immediately; the ready/total tally and the board body
 * each stream in their own boundary (both read the same cache()d loader → one DB
 * hit).
 */
export function PackingPage({ tripId }: { tripId: string }) {
	return (
		<>
			<TripPageHeader
				icon={<Box />}
				title="Pack containers"
				description="Check off each item as it goes into its container."
				actions={
					<Suspense fallback={null}>
						<ContainerPackingActionsData tripId={tripId} />
					</Suspense>
				}
			/>
			<Suspense fallback={<BoardGridSkeleton />}>
				<ContainerPackingData tripId={tripId} />
			</Suspense>
		</>
	);
}

/** Streams the packed tally into the header. */
async function ContainerPackingActionsData({ tripId }: { tripId: string }) {
	const queryClient = getQueryClient();
	const trip = await getContainerPackingBoard(tripId);
	if (!trip) return notFound();
	queryClient.setQueryData(containerPackingBoardKeys.board(tripId), trip);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<ContainerPackingActions tripId={tripId} />
		</HydrationBoundary>
	);
}

/**
 * Streams the board: this server component reads the cache()d loader directly, seeds
 * the query cache, and hands the dehydrated cache to the client. The client island
 * reads from that cache via useSuspenseQuery — it never calls its own fetch queryFn
 * during initial render.
 */
async function ContainerPackingData({ tripId }: { tripId: string }) {
	const queryClient = getQueryClient();
	const trip = await getContainerPackingBoard(tripId);
	if (!trip) return notFound();
	queryClient.setQueryData(containerPackingBoardKeys.board(tripId), trip);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<ContainerPackingContent tripId={tripId} />
		</HydrationBoundary>
	);
}
