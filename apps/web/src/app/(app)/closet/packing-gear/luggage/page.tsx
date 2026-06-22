import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { getQueryClient } from '@/lib/query-client';

import { getAllLuggage } from './_data/fetchers';
import { luggageQueryOptions } from './_data/queries';
import { LuggageBulkAddDialog } from './luggage-bulk-add-dialog';
import { LuggageGrid } from './page-wrapper';
import { CreateLuggageDialog } from './luggage-dialogs';

/**
 * The static toolbar (description + Add buttons) paints instantly — the page title
 * and nav already render from packing-gear/layout.tsx. Only the grid streams: this
 * server component seeds the query cache and hands the dehydrated cache to the grid,
 * which reads it via useSuspenseQuery.
 */
export default function LuggagePage() {
	return (
		<>
			<div className="mb-4 flex items-center justify-between gap-4">
				<div>
					<p className="text-base text-neutral-600">
						Luggage include any large bags that you bring on a trip like
						suitcases and backpacks.
					</p>
				</div>
				<div className="flex gap-2">
					<LuggageBulkAddDialog />
					<CreateLuggageDialog />
				</div>
			</div>
			<Suspense fallback={<LuggageGridSkeleton />}>
				<LuggageData />
			</Suspense>
		</>
	);
}

/** Streams the luggage grid; seeds the cache with the direct DB loader. */
async function LuggageData() {
	const queryClient = getQueryClient();
	await queryClient.prefetchQuery({
		queryKey: luggageQueryOptions.queryKey,
		queryFn: getAllLuggage,
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<LuggageGrid />
		</HydrationBoundary>
	);
}

function LuggageGridSkeleton() {
	return (
		<div className="grid auto-rows-fr grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
			{Array.from({ length: 5 }).map((_, i) => (
				<Skeleton key={i} className="h-32 w-full rounded-xl" />
			))}
		</div>
	);
}
