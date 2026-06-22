import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Luggage } from 'lucide-react';
import { notFound } from 'next/navigation';
import React, { Suspense } from 'react';

import { getQueryClient } from '@/lib/query-client';

import { BoardGridSkeleton } from '../../_components/board-skeletons';
import { TripPageHeader } from '../../_components/trip-page-header';
import { getLuggagePackingBoard } from './_data/fetchers';
import { luggagePackingBoardKeys } from './_data/queries';
import { LuggagePackingActions, LuggagePackingContent } from './page-wrapper';

/**
 * The static header paints immediately; the ready/total tally and the board body
 * each stream in their own boundary (both read the same cache()d loader → one DB
 * hit).
 */
export function PackingPage({ tripId }: { tripId: string }) {
	return (
		<>
			<TripPageHeader
				icon={<Luggage />}
				title="Pack luggage"
				description="Check off each container as it’s secured into your bags."
				actions={
					<Suspense fallback={null}>
						<LuggagePackingActionsData tripId={tripId} />
					</Suspense>
				}
			/>
			<Suspense fallback={<BoardGridSkeleton />}>
				<PackingData tripId={tripId} />
			</Suspense>
		</>
	);
}

/** Streams the packed tally into the header. */
async function LuggagePackingActionsData({ tripId }: { tripId: string }) {
	const queryClient = getQueryClient();
	const trip = await getLuggagePackingBoard(tripId);
	if (!trip) return notFound();
	queryClient.setQueryData(luggagePackingBoardKeys.board(tripId), trip);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<LuggagePackingActions tripId={tripId} />
		</HydrationBoundary>
	);
}

/**
 * Streams the board: this server component reads the cache()d loader directly, seeds
 * the query cache, and hands the dehydrated cache to the client. The client island
 * reads from that cache via useSuspenseQuery — it never calls its own fetch queryFn
 * during initial render.
 */
async function PackingData({ tripId }: { tripId: string }) {
	const queryClient = getQueryClient();
	const trip = await getLuggagePackingBoard(tripId);
	if (!trip) return notFound();
	queryClient.setQueryData(luggagePackingBoardKeys.board(tripId), trip);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<LuggagePackingContent tripId={tripId} />
		</HydrationBoundary>
	);
}
