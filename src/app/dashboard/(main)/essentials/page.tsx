import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { getQueryClient } from '@/lib/query-client';

import { EssentialCategory } from '@/generated/prisma/enums';

import {
	getAllEssentialGroups,
	getAllEssentials,
} from './_data/fetchers';
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
				<Suspense fallback={<EssentialsSkeleton />}>
					<EssentialsData />
				</Suspense>
			</div>
		</div>
	);
}

/**
 * Streams the essentials tabs: the page shell paints immediately while this server
 * component prefetches into the query cache (using the direct DB loaders as the
 * queryFn) and hands the dehydrated cache to the client. The client's
 * useSuspenseQuery reads from that cache — it never calls its own fetch queryFn
 * during the initial render.
 */
async function EssentialsData() {
	const queryClient = getQueryClient();
	await Promise.all([
		queryClient.prefetchQuery({
			queryKey: essentialsQueryOptions.queryKey,
			queryFn: getAllEssentials,
		}),
		queryClient.prefetchQuery({
			queryKey: essentialGroupsQueryOptions.queryKey,
			queryFn: getAllEssentialGroups,
		}),
	]);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<EssentialsTabs />
		</HydrationBoundary>
	);
}

function EssentialsSkeleton() {
	return (
		<div className="flex-1">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<Skeleton className="h-9 w-48" />
				<div className="flex items-center gap-2">
					<Skeleton className="size-9 sm:h-10 sm:w-28" />
					<Skeleton className="size-9 sm:h-10 sm:w-36" />
				</div>
			</div>
			<div className="mt-4 flex flex-col gap-8">
				{Object.values(EssentialCategory).map((category) => (
					<div key={category}>
						<Skeleton className="mb-2 h-7 w-40" />
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
							{Array.from({ length: 5 }).map((_, i) => (
								<Skeleton key={i} className="h-32 w-full rounded-xl" />
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
