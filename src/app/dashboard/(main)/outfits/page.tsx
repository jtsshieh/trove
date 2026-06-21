import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';

import { DisplayModeProvider } from '@/components/display-mode';
import { Skeleton } from '@/components/ui/skeleton';
import { getQueryClient } from '@/lib/query-client';

import { getUserSettings } from '../account/_data/fetchers';
import { getAllClothes } from '../wardrobe/_data/fetchers';
import { getAllTrips } from '../../(trip-viewer)/[tripId]/_data/fetchers';
import { getAllOutfits } from './_data/fetchers';
import { outfitsQueryOptions } from './_data/queries';
import { OutfitBuilder } from './outfit-builder';

export default function OutfitsPage() {
	return (
		<div className="flex w-full flex-1 justify-center">
			<div className="flex w-full max-w-screen-2xl flex-1 flex-col">
				<Suspense fallback={<OutfitsSkeleton />}>
					<OutfitsContent />
				</Suspense>
			</div>
		</div>
	);
}

async function OutfitsContent() {
	const queryClient = getQueryClient();
	const [, wardrobe, trips, settings] = await Promise.all([
		queryClient.prefetchQuery({
			queryKey: outfitsQueryOptions.queryKey,
			queryFn: getAllOutfits,
		}),
		getAllClothes(),
		getAllTrips(),
		getUserSettings(),
	]);

	return (
		<DisplayModeProvider initial={settings.displayMode}>
			<HydrationBoundary state={dehydrate(queryClient)}>
				<OutfitBuilder wardrobe={wardrobe} trips={trips} />
			</HydrationBoundary>
		</DisplayModeProvider>
	);
}

function OutfitsSkeleton() {
	return (
		<>
			<div className="mb-4 flex items-center justify-between gap-4 border-b pb-4">
				<div className="flex-1 space-y-2">
					<Skeleton className="h-9 w-44" />
					<Skeleton className="h-5 w-96 max-w-full" />
				</div>
				<div className="flex items-center gap-2">
					<Skeleton className="h-8 w-28" />
					<Skeleton className="h-8 w-32" />
				</div>
			</div>
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
				{Array.from({ length: 8 }).map((_, i) => (
					<Skeleton key={i} className="aspect-[4/5] w-full rounded-xl" />
				))}
			</div>
		</>
	);
}
