import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { getQueryClient } from '@/lib/query-client';

import { getAllLuggage } from './_data/fetchers';
import { luggageQueryOptions } from './_data/queries';
import { LuggageContent } from './page-wrapper';

export default function LuggagePage() {
	return (
		<Suspense fallback={<LuggageSkeleton />}>
			<LuggageData />
		</Suspense>
	);
}

/**
 * Streams the luggage list: the page shell paints immediately while this server
 * component prefetches into the query cache (using the direct DB loader as the
 * queryFn) and hands the dehydrated cache to the client. The client's
 * useSuspenseQuery reads from that cache — it never calls its own fetch queryFn
 * during the initial render.
 */
async function LuggageData() {
	const queryClient = getQueryClient();
	await queryClient.prefetchQuery({
		queryKey: luggageQueryOptions.queryKey,
		queryFn: getAllLuggage,
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<LuggageContent />
		</HydrationBoundary>
	);
}

function LuggageSkeleton() {
	return (
		<>
			<div className="mb-4 flex items-center justify-between gap-4">
				<Skeleton className="h-5 w-96 max-w-full" />
				<div className="flex gap-2">
					<Skeleton className="size-9" />
					<Skeleton className="h-9 w-32" />
				</div>
			</div>
			<div className="grid auto-rows-fr grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
				{Array.from({ length: 5 }).map((_, i) => (
					<Skeleton key={i} className="h-32 w-full rounded-xl" />
				))}
			</div>
		</>
	);
}
