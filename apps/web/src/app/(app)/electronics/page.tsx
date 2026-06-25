import { HydrationBoundary, dehydrate } from '@tanstack/react-query';

import { getAllBrands } from '@/app/(app)/closet/clothing/brands/_data/fetchers';
import { getQueryClient } from '@/lib/query-client';

import { getAllElectronics } from './_data/fetchers';
import { brandsQueryOptions, electronicsQueryOptions } from './_data/queries';
import { ElectronicsHeader } from './electronics-header';

export default function ElectronicsPage() {
	return (
		<div className="flex w-full flex-1 justify-center">
			<div className="flex w-full max-w-screen-2xl flex-1 flex-col">
				<ElectronicsData />
			</div>
		</div>
	);
}

/**
 * The header (title + Add button) paints immediately. We fire the prefetches
 * WITHOUT awaiting — the query client dehydrates the still-pending queries, so the
 * list (and the Add dialog's brand picker) stream to the client via their own
 * nested Suspense boundaries instead of blocking this subtree.
 */
function ElectronicsData() {
	const queryClient = getQueryClient();
	void queryClient.prefetchQuery({
		queryKey: electronicsQueryOptions.queryKey,
		queryFn: getAllElectronics,
	});
	void queryClient.prefetchQuery({
		queryKey: brandsQueryOptions.queryKey,
		queryFn: getAllBrands,
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<ElectronicsHeader />
		</HydrationBoundary>
	);
}
