import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { getQueryClient } from '@/lib/query-client';

import { getAllContainers } from './_data/fetchers';
import { containersQueryOptions } from './_data/queries';
import { ContainerWrapper } from './page-wrapper';

export default function ContainersPage() {
	return (
		<Suspense fallback={<ContainersSkeleton />}>
			<ContainersData />
		</Suspense>
	);
}

/**
 * Streams the containers list: the page shell paints immediately while this server
 * component prefetches into the query cache (using the direct DB loader as the
 * queryFn) and hands the dehydrated cache to the client. The client's
 * useSuspenseQuery reads from that cache — it never calls its own fetch queryFn
 * during the initial render.
 */
async function ContainersData() {
	const queryClient = getQueryClient();
	await queryClient.prefetchQuery({
		queryKey: containersQueryOptions.queryKey,
		queryFn: getAllContainers,
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<ContainerWrapper />
		</HydrationBoundary>
	);
}

function ContainersSkeleton() {
	return (
		<>
			<div className="mb-4 flex items-center justify-between gap-4">
				<Skeleton className="h-5 w-96 max-w-full" />
				<div className="flex gap-2">
					<Skeleton className="size-9" />
					<Skeleton className="h-9 w-32" />
				</div>
			</div>
			<div className="grid auto-rows-fr grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
				{Array.from({ length: 5 }).map((_, i) => (
					<Skeleton key={i} className="h-32 w-full rounded-xl" />
				))}
			</div>
		</>
	);
}
