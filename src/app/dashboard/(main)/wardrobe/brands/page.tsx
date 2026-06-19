import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getQueryClient } from '@/lib/query-client';

import { brandsQueryOptions } from './_data/queries';
import { BrandsListContent } from './page-wrapper';
import { CreateBrandDialog } from './brand-dialogs';

export default function Brands() {
	const queryClient = getQueryClient();
	// Non-blocking: kick off the query without awaiting so the page can stream.
	void queryClient.prefetchQuery(brandsQueryOptions);

	return (
		<div className="h-svh w-screen p-8">
			<Button
				size="icon"
				variant="ghost"
				className="mb-4"
				nativeButton={false}
				render={<Link href="/dashboard" />}
			>
				<ChevronLeft />
			</Button>
			<div className="flex justify-between">
				<div>
					<h1 className="text-3xl">Brands</h1>
					<h2 className="mb-4 text-base text-neutral-600">
						These are the brands currently registered to the system.
					</h2>
				</div>
				<CreateBrandDialog />
			</div>
			<HydrationBoundary state={dehydrate(queryClient)}>
				<Suspense fallback={<BrandsListSkeleton />}>
					<BrandsListContent />
				</Suspense>
			</HydrationBoundary>
		</div>
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
