import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';

import { DisplayModeProvider } from '@/components/display-mode';
import { Skeleton } from '@/components/ui/skeleton';
import { getQueryClient } from '@/lib/query-client';

import { getUserSettings } from '@/lib/auth';
import { getAllClothes } from '@/app/(app)/closet/clothing/_data/fetchers';
import { getAllTrips } from '@/app/(app)/trip-planner/[tripId]/_data/fetchers';
import { getAllOutfits } from './_data/fetchers';
import { OutfitActionsProvider } from './outfit-actions-context';
import { outfitsQueryOptions } from './_data/queries';
import { OutfitBuilder } from './outfit-builder';
import { OutfitsHeader } from './outfits-header';

/**
 * The static title + action buttons paint immediately (the buttons drive the
 * builder through the outfit actions context); only the outfit grid streams.
 */
export default async function OutfitsPage() {
	const settings = await getUserSettings();

	return (
		<div className="flex w-full flex-1 justify-center">
			<div className="flex w-full max-w-screen-2xl flex-1 flex-col">
				<DisplayModeProvider initial={settings.displayMode}>
					<OutfitActionsProvider>
						<OutfitsHeader />
						<Suspense fallback={<OutfitsGridSkeleton />}>
							<OutfitsGrid />
						</Suspense>
					</OutfitActionsProvider>
				</DisplayModeProvider>
			</div>
		</div>
	);
}

async function OutfitsGrid() {
	const queryClient = getQueryClient();
	const [, wardrobe, trips] = await Promise.all([
		queryClient.prefetchQuery({
			queryKey: outfitsQueryOptions.queryKey,
			queryFn: getAllOutfits,
		}),
		getAllClothes(),
		getAllTrips(),
	]);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<OutfitBuilder wardrobe={wardrobe} trips={trips} chromeless />
		</HydrationBoundary>
	);
}

function OutfitsGridSkeleton() {
	return (
		<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			{Array.from({ length: 8 }).map((_, i) => (
				<Skeleton key={i} className="aspect-[4/5] w-full rounded-xl" />
			))}
		</div>
	);
}
