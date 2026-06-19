import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { getQueryClient } from '@/lib/query-client';

import { brandsQueryOptions, clothingTypesQueryOptions } from './_data/queries';
import { WardrobeContent } from './page-wrapper';

export default function WardrobePage() {
	const queryClient = getQueryClient();
	// Non-blocking: kick off the queries without awaiting so the page can stream.
	void queryClient.prefetchQuery(brandsQueryOptions);
	void queryClient.prefetchQuery(clothingTypesQueryOptions);

	return (
		<div className="flex w-full flex-1 justify-center">
			<div className="flex w-full max-w-screen-2xl flex-1 flex-col">
				<HydrationBoundary state={dehydrate(queryClient)}>
					<Suspense fallback={<WardrobeSkeleton />}>
						<WardrobeContent />
					</Suspense>
				</HydrationBoundary>
			</div>
		</div>
	);
}

function WardrobeSkeleton() {
	return (
		<>
			<div className="mb-4 flex items-center justify-between gap-4 border-b pb-4">
				<div className="flex-1 space-y-2">
					<Skeleton className="h-9 w-48" />
					<Skeleton className="h-5 w-96 max-w-full" />
				</div>
				<Skeleton className="h-9 w-32" />
			</div>
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
		</>
	);
}
