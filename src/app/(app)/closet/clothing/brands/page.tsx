import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getQueryClient } from '@/lib/query-client';

import { getAllBrands } from './_data/fetchers';
import { brandsQueryOptions } from './_data/queries';
import { BrandsListContent } from './page-wrapper';
import { CreateBrandDialog } from './brand-dialogs';

export default function Brands() {
	return (
		<div className="h-svh w-screen p-8">
			<Button
				size="icon"
				variant="ghost"
				className="mb-4"
				nativeButton={false}
				render={<Link href="/closet/clothing" />}
			>
				<ChevronLeft />
			</Button>
			<div className="flex justify-between">
				<div>
					<h1 className="text-3xl">Brands</h1>
					<h2 className="mb-4 text-base text-neutral-600">
						The brands in your personal catalog.
					</h2>
				</div>
				<CreateBrandDialog />
			</div>
			<Suspense fallback={<BrandsListSkeleton />}>
				<BrandsData />
			</Suspense>
		</div>
	);
}

async function BrandsData() {
	const queryClient = getQueryClient();
	// Prefetch with the direct DB loader (the client queryFn is a relative fetch
	// that can't run on the server), then hydrate the client.
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

function BrandsListSkeleton() {
	return (
		<div className="grid grid-cols-4 gap-2">
			{Array.from({ length: 8 }).map((_, i) => (
				<Skeleton key={i} className="h-32 w-full rounded-xl" />
			))}
		</div>
	);
}
