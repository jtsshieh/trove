import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { DEFAULT_CLOTHING_TYPES } from '@/lib/clothing-types-catalog';
import { listClothingTypes } from '@/lib/domains/clothing-types/service';
import { getQueryClient } from '@/lib/query-client';

import { getCurrentUserSafe, getUserSettings } from '@/lib/auth';
import { getAllBrands } from './brands/_data/fetchers';
import { BrandsListContent } from './brands/page-wrapper';
import { getAllClothingTypesWithClothes } from './_data/fetchers';
import { brandsQueryOptions, clothingTypesQueryOptions } from './_data/queries';
import { WardrobeContent } from './page-wrapper';
import { WardrobeTabs } from './wardrobe-tabs';
import { ClothingTypesManager } from './types/clothing-types-manager';

export default async function WardrobePage() {
	// The title + tab bar must paint instantly, so we only await the cheap settings
	// read. The tab bar's action buttons (Add Clothing) need brands + types: fire
	// that prefetch WITHOUT awaiting — the query client dehydrates the still-pending
	// queries, so they stream to the client (which shows a button skeleton until
	// they resolve) instead of blocking the whole page.
	const queryClient = getQueryClient();
	const settings = await getUserSettings();
	void queryClient.prefetchQuery({
		queryKey: brandsQueryOptions.queryKey,
		queryFn: getAllBrands,
	});
	void queryClient.prefetchQuery({
		queryKey: clothingTypesQueryOptions.queryKey,
		queryFn: getAllClothingTypesWithClothes,
	});

	return (
		<div className="flex w-full flex-1 justify-center">
			<div className="flex w-full max-w-screen-2xl flex-1 flex-col">
				<div className="mb-4 flex flex-col gap-1 border-b pb-4">
					<h1 className="text-3xl font-bold">Clothing</h1>
					<h2 className="text-base text-neutral-600">
						Everything in your closet and the brands you track.
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
						brands={
							<Suspense fallback={<BrandsSkeleton />}>
								<BrandsData />
							</Suspense>
						}
						types={
							<Suspense fallback={<TypesSkeleton />}>
								<TypesData />
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

/**
 * Streams the types tab: the manager is a plain client component (props, not a
 * query), so we just load the user's catalog server-side and hand it the existing
 * types + the suggested catalog to fill the picker's "don't include" column.
 */
async function TypesData() {
	const user = await getCurrentUserSafe();
	const existing = await listClothingTypes(user.id);
	return (
		<div className="mx-auto w-full max-w-screen-md">
			<ClothingTypesManager
				existing={existing.map((t) => ({ name: t.name, category: t.category }))}
				catalog={DEFAULT_CLOTHING_TYPES}
			/>
		</div>
	);
}

function WardrobeSkeleton() {
	return (
		<div className="flex flex-1 flex-col gap-8">
			{Array.from({ length: 2 }).map((_, i) => (
				<div key={i}>
					<Skeleton className="mb-2 h-7 w-32" />
					<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
						{Array.from({ length: 5 }).map((_, j) => (
							<Skeleton key={j} className="h-32 w-full rounded-xl" />
						))}
					</div>
				</div>
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

function TypesSkeleton() {
	return (
		<div className="mx-auto w-full max-w-screen-md">
			<Skeleton className="h-96 w-full rounded-xl" />
		</div>
	);
}
