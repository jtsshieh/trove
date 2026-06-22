import { HydrationBoundary, dehydrate } from '@tanstack/react-query';

import { getQueryClient } from '@/lib/query-client';

import { getAllEssentialGroups, getAllEssentials } from './_data/fetchers';
import {
	essentialGroupsQueryOptions,
	essentialsQueryOptions,
} from './_data/queries';
import { EssentialsTabs } from './essentials-tabs';

export default function EssentialsPage() {
	return (
		<div className="flex w-full flex-1 justify-center">
			<div className="flex w-full max-w-screen-2xl flex-1 flex-col">
				<div className="mb-4 flex flex-col gap-1 border-b pb-4">
					<h1 className="text-3xl font-bold">Essentials</h1>
					<h2 className="text-base text-neutral-600">
						These are all the essentials that are registered to the system.
					</h2>
				</div>
				<EssentialsData />
			</div>
		</div>
	);
}

/**
 * The static EssentialsTabs (tab bar) paints immediately. We fire the prefetches
 * WITHOUT awaiting — the query client dehydrates the still-pending queries, so the
 * tab content (and the group-tab's add button) stream to the client via their own
 * nested Suspense boundaries instead of blocking this subtree.
 */
function EssentialsData() {
	const queryClient = getQueryClient();
	void queryClient.prefetchQuery({
		queryKey: essentialsQueryOptions.queryKey,
		queryFn: getAllEssentials,
	});
	void queryClient.prefetchQuery({
		queryKey: essentialGroupsQueryOptions.queryKey,
		queryFn: getAllEssentialGroups,
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<EssentialsTabs />
		</HydrationBoundary>
	);
}
