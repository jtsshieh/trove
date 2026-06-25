import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import React, { Suspense } from 'react';

import { AppShell } from '@/components/app-shell/app-shell';
import { getCurrentUserSafe, isAdmin } from '@/lib/auth';
import { getQueryClient } from '@/lib/query-client';

import { getAllTrips } from '@/app/(app)/trips/[tripId]/_data/fetchers';
import { tripsQueryOptions } from '@/app/(app)/trips/[tripId]/_data/queries';
import { TripListContent } from './page-wrapper';
import { CreateTripDialog } from './trip-dialogs';
import { TripListLoading } from './trip-list';
import { TRIP_PLANNER_SECTIONS } from './trip-planner-sections';

export default async function TripsPage() {
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
						<div className="flex-1">
							<h1 className="text-3xl font-bold">Trips</h1>
							<h2 className="text-base text-neutral-600">
								These are the trips that you've created.
							</h2>
						</div>
						<CreateTripDialog />
					</div>
					<Suspense fallback={<TripListLoading />}>
						<TripsData />
					</Suspense>
				</div>
			</div>
		</AppShell>
	);
}

/**
 * Streams the trips list: prefetches with the direct DB loader as the queryFn
 * (the client queryFn is a relative fetch that can't run on the server), then
 * hands the dehydrated cache to the client.
 */
async function TripsData() {
	const queryClient = getQueryClient();
	await queryClient.prefetchQuery({
		queryKey: tripsQueryOptions.queryKey,
		queryFn: getAllTrips,
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<TripListContent />
		</HydrationBoundary>
	);
}
