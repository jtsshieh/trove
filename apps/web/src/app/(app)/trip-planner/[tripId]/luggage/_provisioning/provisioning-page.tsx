import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Luggage } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { getQueryClient } from '@/lib/query-client';

import {
	HeaderActionsSkeleton,
	LuggageBoardSkeleton,
} from '../../_components/board-skeletons';
import { TripPageHeader } from '../../_components/trip-page-header';
import {
	LuggageProvisioningActions,
	LuggageProvisioningContent,
} from './page-wrapper';
import { getLuggageProvisioningBoard } from './_data/fetchers';
import { luggageBoardKeys } from './_data/queries';

/**
 * The static header paints immediately; the data-dependent actions and the board
 * body (including the assigned-progress bar) each stream in their own boundary —
 * both read the same cache()d loader, so one DB hit.
 */
export function ProvisioningPage({ tripId }: { tripId: string }) {
	return (
		<>
			<TripPageHeader
				icon={<Luggage />}
				title="Suitcases"
				description="Drag each container into the suitcase it'll be packed in."
				actions={
					<Suspense fallback={<HeaderActionsSkeleton />}>
						<LuggageProvisioningActionsData tripId={tripId} />
					</Suspense>
				}
			/>
			<Suspense fallback={<LuggageBoardSkeleton />}>
				<ProvisioningData tripId={tripId} />
			</Suspense>
		</>
	);
}

/** Streams the available-suitcase catalog into the cache, then the header actions. */
async function LuggageProvisioningActionsData({ tripId }: { tripId: string }) {
	const queryClient = getQueryClient();
	const data = await getLuggageProvisioningBoard(tripId);
	if (!data) return notFound();
	queryClient.setQueryData(luggageBoardKeys.board(tripId), data);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<LuggageProvisioningActions tripId={tripId} />
		</HydrationBoundary>
	);
}

/**
 * Streams the board: this server component reads the cache()d loader directly, seeds
 * the query cache, and hands the dehydrated cache to the client. The client board
 * reads from that cache via useSuspenseQuery — it never calls its own fetch queryFn
 * during initial render.
 */
async function ProvisioningData({ tripId }: { tripId: string }) {
	const queryClient = getQueryClient();
	const data = await getLuggageProvisioningBoard(tripId);
	if (!data) return notFound();
	queryClient.setQueryData(luggageBoardKeys.board(tripId), data);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<LuggageProvisioningContent tripId={tripId} />
		</HydrationBoundary>
	);
}
