import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Shirt } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { getUserSettings } from '@/app/(app)/account/_data/fetchers';
import { getQueryClient } from '@/lib/query-client';

import { DayCardListSkeleton } from '../_components/board-skeletons';
import { TripPageHeader } from '../_components/trip-page-header';
import { getTrip } from '../_data/fetchers';
import { ClothingBoardControlsProvider } from './board-controls';
import { ClothingBoardActions, ClothingBoardContent } from './page-wrapper';
import { getClothingBoardData } from './_data/fetchers';
import { clothingBoardKeys } from './_data/queries';

/**
 * The static header paints from cheap reads (the cache()d trip for the date range +
 * the user's view settings); the interactive actions and the board body each stream
 * in their own boundary. The view/piece-size/closet controls are shared between the
 * header and board via ClothingBoardControlsProvider, which wraps both.
 */
export default async function ClothingPage(props: {
	params: Promise<{ tripId: string }>;
}) {
	const { tripId } = await props.params;
	const [trip, settings] = await Promise.all([
		getTrip(tripId),
		getUserSettings(),
	]);
	if (!trip) return notFound();

	return (
		<ClothingBoardControlsProvider
			initialView={settings.defaultProvisionView}
			initialPieceSize={settings.pieceSize}
		>
			<TripPageHeader
				icon={<Shirt />}
				title="Clothing"
				description={`${format(trip.start, 'MMM d')} – ${format(trip.end, 'MMM d')}`}
				actions={<ClothingBoardActions />}
			/>
			<Suspense fallback={<DayCardListSkeleton />}>
				<ClothingData tripId={tripId} />
			</Suspense>
		</ClothingBoardControlsProvider>
	);
}

/**
 * Streams the board: this server component reads the cache()d loader directly, seeds
 * the query cache, and hands the dehydrated cache to the client. The client board
 * reads from that cache via useSuspenseQuery — it never calls its own fetch queryFn
 * during initial render.
 */
async function ClothingData({ tripId }: { tripId: string }) {
	const queryClient = getQueryClient();
	const data = await getClothingBoardData(tripId);
	if (!data) return notFound();
	queryClient.setQueryData(clothingBoardKeys.board(tripId), data);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<ClothingBoardContent tripId={tripId} />
		</HydrationBoundary>
	);
}
