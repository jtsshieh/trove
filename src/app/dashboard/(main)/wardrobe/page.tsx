import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { getQueryClient } from '@/lib/query-client';

import { getUserSettings } from '../account/_data/fetchers';
import { getAllTrips } from '../../(trip-viewer)/[tripId]/_data/fetchers';
import { getAllOutfits } from '../outfits/_data/fetchers';
import { outfitsQueryOptions } from '../outfits/_data/queries';
import { OutfitBuilder } from '../outfits/outfit-builder';
import { getAllBrands } from './brands/_data/fetchers';
import { BrandsListContent } from './brands/page-wrapper';
import { getAllClothingTypesWithClothes, getAllClothes } from './_data/fetchers';
import { brandsQueryOptions, clothingTypesQueryOptions } from './_data/queries';
import { WardrobeContent } from './page-wrapper';
import { WardrobeTabs } from './wardrobe-tabs';

export default async function WardrobePage() {
	// Prefetch what the TAB BAR's action buttons need (brands + types for the Add
	// Clothing dialog) and hydrate it around the whole tab component — those actions
	// live in the tab bar (a client component), so without a HydrationBoundary their
	// useSuspenseQuery would run server-side and try to fetch the relative /api route.
	const queryClient = getQueryClient();
	const [, , settings] = await Promise.all([
		queryClient.prefetchQuery({
			queryKey: brandsQueryOptions.queryKey,
			queryFn: getAllBrands,
		}),
		queryClient.prefetchQuery({
			queryKey: clothingTypesQueryOptions.queryKey,
			queryFn: getAllClothingTypesWithClothes,
		}),
		getUserSettings(),
	]);

	return (
		<div className="flex w-full flex-1 justify-center">
			<div className="flex w-full max-w-screen-2xl flex-1 flex-col">
				<div className="mb-4 flex flex-col gap-1 border-b pb-4">
					<h1 className="text-3xl font-bold">Wardrobe</h1>
					<h2 className="text-base text-neutral-600">
						Everything in your closet, the outfits you build from it, and the
						brands you track.
					</h2>
				</div>
				<HydrationBoundary state={dehydrate(queryClient)}>
					<WardrobeTabs
						displayMode={settings.displayMode}
						clothes={
							<Suspense fallback={<WardrobeSkeleton />}>
								<WardrobeData />
							</Suspense>
						}
						outfits={
							<Suspense fallback={<OutfitsSkeleton />}>
								<OutfitsContent />
							</Suspense>
						}
						brands={
							<Suspense fallback={<BrandsSkeleton />}>
								<BrandsData />
							</Suspense>
						}
					/>
				</HydrationBoundary>
			</div>
		</div>
	);
}

/**
 * Streams the clothes tab: the page shell paints immediately while this server
 * component prefetches into the query cache (using the direct DB loaders as the
 * queryFn) and hands the dehydrated cache to the client. The client's
 * useSuspenseQuery reads from that cache — it never calls its own fetch queryFn
 * during the initial render.
 */
async function WardrobeData() {
	const queryClient = getQueryClient();
	await Promise.all([
		queryClient.prefetchQuery({
			queryKey: brandsQueryOptions.queryKey,
			queryFn: getAllBrands,
		}),
		queryClient.prefetchQuery({
			queryKey: clothingTypesQueryOptions.queryKey,
			queryFn: getAllClothingTypesWithClothes,
		}),
	]);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<WardrobeContent />
		</HydrationBoundary>
	);
}

async function OutfitsContent() {
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

/** Streams the brands tab; prefetches the brands list like the standalone route. */
async function BrandsData() {
	const queryClient = getQueryClient();
	await queryClient.prefetchQuery({
		queryKey: brandsQueryOptions.queryKey,
		queryFn: getAllBrands,
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<BrandsListContent />
		</HydrationBoundary>
	);
}

function WardrobeSkeleton() {
	return (
		<div className="flex flex-1 flex-col gap-8">
			{Array.from({ length: 2 }).map((_, i) => (
				<div key={i}>
					<Skeleton className="mb-2 h-7 w-32" />
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
						{Array.from({ length: 5 }).map((_, j) => (
							<Skeleton key={j} className="h-32 w-full rounded-xl" />
						))}
					</div>
				</div>
			))}
		</div>
	);
}

function OutfitsSkeleton() {
	return (
		<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			{Array.from({ length: 8 }).map((_, i) => (
				<Skeleton key={i} className="aspect-[4/5] w-full rounded-xl" />
			))}
		</div>
	);
}

function BrandsSkeleton() {
	return (
		<div className="grid grid-cols-4 gap-2">
			{Array.from({ length: 8 }).map((_, i) => (
				<Skeleton key={i} className="h-32 w-full rounded-xl" />
			))}
		</div>
	);
}
