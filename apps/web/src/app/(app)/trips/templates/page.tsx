import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';

import { AppShell } from '@/components/app-shell/app-shell';
import { Skeleton } from '@/components/ui/skeleton';
import { getCurrentUserSafe, isAdmin } from '@/lib/auth';
import { getQueryClient } from '@/lib/query-client';

import { getTemplatesPageData } from './_data/fetchers';
import { templatesQueryOptions } from './_data/queries';
import { TemplatesHeaderActions, TemplatesListContent } from './page-wrapper';
import { TRIP_PLANNER_SECTIONS } from '../trip-planner-sections';

export default async function TemplatesPage() {
	const user = await getCurrentUserSafe();
	return (
		<AppShell
			appId="trips"
			username={user.username}
			isAdmin={isAdmin(user)}
			sections={TRIP_PLANNER_SECTIONS}
		>
			<div className="flex w-full flex-1 justify-center">
				<div className="flex w-full max-w-screen-lg flex-1 flex-col">
					<div className="mb-4 flex items-center justify-between gap-4 border-b pb-4">
						<div className="flex flex-1 flex-col gap-1">
							<h1 className="text-3xl font-bold">Templates</h1>
							<h2 className="text-base text-neutral-600">
								Reusable bundles of essentials you can import onto any trip.
							</h2>
						</div>
						<Suspense fallback={<Skeleton className="h-9 w-36 rounded-md" />}>
							<TemplatesHeader />
						</Suspense>
					</div>
					<Suspense fallback={<TemplatesListSkeleton />}>
						<TemplatesData />
					</Suspense>
				</div>
			</div>
		</AppShell>
	);
}

/** Streams the catalog into cache, then the create-template action. */
async function TemplatesHeader() {
	const queryClient = getQueryClient();
	const data = await getTemplatesPageData();
	queryClient.setQueryData(templatesQueryOptions.queryKey, data);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<TemplatesHeaderActions />
		</HydrationBoundary>
	);
}

/** Streams the templates list (groups + catalog) from the same cache()d loader. */
async function TemplatesData() {
	const queryClient = getQueryClient();
	const data = await getTemplatesPageData();
	queryClient.setQueryData(templatesQueryOptions.queryKey, data);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<TemplatesListContent />
		</HydrationBoundary>
	);
}

function TemplatesListSkeleton() {
	return (
		<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
			{Array.from({ length: 6 }).map((_, i) => (
				<Skeleton key={i} className="h-40 w-full rounded-xl" />
			))}
		</div>
	);
}
