import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Backpack } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { getQueryClient } from '@/lib/query-client';

import {
	DayCardListSkeleton,
	HeaderActionsSkeleton,
} from '../_components/board-skeletons';
import { TripPageHeader } from '../_components/trip-page-header';
import { LiquidsCompliancePanel } from './liquids-compliance-panel';
import { EssentialsBoardActions, EssentialsBoardContent } from './page-wrapper';
import { getEssentialsBoardData } from './_data/fetchers';
import { essentialsBoardKeys } from './_data/queries';

/**
 * The static header paints immediately; the data-dependent actions (import-group /
 * add-essentials pickers) and the board body each stream in their own boundary —
 * both read the same cache()d loader, so one DB hit.
 */
export default async function EssentialsPage(props: {
	params: Promise<{ tripId: string }>;
}) {
	const { tripId } = await props.params;

	return (
		<>
			<TripPageHeader
				icon={<Backpack />}
				title="Essentials"
				description="Grouped by type. Drop items into a sub-group, or import a premade group."
				actions={
					<Suspense fallback={<HeaderActionsSkeleton />}>
						<EssentialsBoardActionsData tripId={tripId} />
					</Suspense>
				}
			/>
			<Suspense fallback={null}>
				<LiquidsCompliancePanel tripId={tripId} />
			</Suspense>
			<Suspense fallback={<DayCardListSkeleton />}>
				<EssentialsData tripId={tripId} />
			</Suspense>
		</>
	);
}

/** Streams the closet + premade groups into the cache, then the header actions. */
async function EssentialsBoardActionsData({ tripId }: { tripId: string }) {
	const queryClient = getQueryClient();
	const data = await getEssentialsBoardData(tripId);
	if (!data) return notFound();
	queryClient.setQueryData(essentialsBoardKeys.board(tripId), data);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<EssentialsBoardActions tripId={tripId} />
		</HydrationBoundary>
	);
}

/**
 * Streams the board: this server component reads the cache()d loader directly, seeds
 * the query cache, and hands the dehydrated cache to the client. The client board
 * reads from that cache via useSuspenseQuery — it never calls its own fetch queryFn
 * during initial render.
 */
async function EssentialsData({ tripId }: { tripId: string }) {
	const queryClient = getQueryClient();
	const data = await getEssentialsBoardData(tripId);
	if (!data) return notFound();
	queryClient.setQueryData(essentialsBoardKeys.board(tripId), data);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<EssentialsBoardContent tripId={tripId} />
		</HydrationBoundary>
	);
}
