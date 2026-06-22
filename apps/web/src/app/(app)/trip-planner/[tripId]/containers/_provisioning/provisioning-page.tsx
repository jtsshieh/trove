import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Package } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { getQueryClient } from '@/lib/query-client';

import {
	BoardGridSkeleton,
	HeaderActionsSkeleton,
} from '../../_components/board-skeletons';
import { TripPageHeader } from '../../_components/trip-page-header';
import { ContainerBoardActions, ContainerBoardContent } from './page-wrapper';
import { getContainerBoardData } from './_data/fetchers';
import { containerBoardKeys } from './_data/queries';

/**
 * The static header paints immediately; the data-dependent actions and the board
 * body each stream in their own boundary (both read the same cache()d loader → one
 * DB hit). Navigating into the tab never flashes a full-page placeholder.
 */
export function ProvisioningPage({ tripId }: { tripId: string }) {
	return (
		<>
			<TripPageHeader
				icon={<Package />}
				title="Containers"
				description="Sort every provisioned item into the bags and cubes you’re bringing."
				actions={
					<Suspense fallback={<HeaderActionsSkeleton />}>
						<ContainerBoardActionsData tripId={tripId} />
					</Suspense>
				}
			/>
			<Suspense fallback={<BoardGridSkeleton />}>
				<ContainerData tripId={tripId} />
			</Suspense>
		</>
	);
}

/** Streams the available-container catalog into the cache, then the header actions. */
async function ContainerBoardActionsData({ tripId }: { tripId: string }) {
	const queryClient = getQueryClient();
	const data = await getContainerBoardData(tripId);
	if (!data) return notFound();
	queryClient.setQueryData(containerBoardKeys.board(tripId), data);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<ContainerBoardActions tripId={tripId} />
		</HydrationBoundary>
	);
}

/**
 * Streams the board: this server component reads the cache()d loader directly,
 * seeds the query cache, and hands the dehydrated cache to the client. The client
 * board reads from that cache via useSuspenseQuery — it never calls its own fetch
 * queryFn during initial render.
 */
async function ContainerData({ tripId }: { tripId: string }) {
	const queryClient = getQueryClient();
	const data = await getContainerBoardData(tripId);
	if (!data) return notFound();
	queryClient.setQueryData(containerBoardKeys.board(tripId), data);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<ContainerBoardContent tripId={tripId} />
		</HydrationBoundary>
	);
}
