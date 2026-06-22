import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { getQueryClient } from '@/lib/query-client';

import { getAllContainers } from './_data/fetchers';
import { containersQueryOptions } from './_data/queries';
import { ContainerBulkAddDialog } from './container-bulk-add-dialog';
import { CreateContainerDialog } from './container-dialogs';
import { ContainerGrid } from './page-wrapper';

/**
 * The static toolbar (description + Add buttons) paints instantly — the page title
 * and nav already render from packing-gear/layout.tsx. Only the grid streams: this
 * server component seeds the query cache and hands the dehydrated cache to the grid,
 * which reads it via useSuspenseQuery.
 */
export default function ContainersPage() {
	return (
		<>
			<div className="mb-4 flex items-center justify-between gap-4">
				<div>
					<p className="text-base text-neutral-600">
						Containers are smaller containers, like packing cubes or toiletry
						bags, that are packed in luggage.
					</p>
				</div>
				<div className="flex gap-2">
					<ContainerBulkAddDialog />
					<CreateContainerDialog />
				</div>
			</div>
			<Suspense fallback={<ContainerGridSkeleton />}>
				<ContainersData />
			</Suspense>
		</>
	);
}

/** Streams the containers grid; seeds the cache with the direct DB loader. */
async function ContainersData() {
	const queryClient = getQueryClient();
	await queryClient.prefetchQuery({
		queryKey: containersQueryOptions.queryKey,
		queryFn: getAllContainers,
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<ContainerGrid />
		</HydrationBoundary>
	);
}

function ContainerGridSkeleton() {
	return (
		<div className="grid auto-rows-fr grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
			{Array.from({ length: 5 }).map((_, i) => (
				<Skeleton key={i} className="h-32 w-full rounded-xl" />
			))}
		</div>
	);
}
