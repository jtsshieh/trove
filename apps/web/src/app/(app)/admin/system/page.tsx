import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import React from 'react';

import { getQueryClient } from '@/lib/query-client';

import { getSystemStatus } from './_data/fetchers';
import { systemStatusQueryOptions } from './_data/queries';
import { SystemClient } from './system-client';

// Access is gated by the Admin layout (requireAdminPage).
export default async function SystemPage() {
	// Seed the status into the cache so the client renders the cards immediately
	// (no initial spinner) and keeps its on-demand polling from there.
	const queryClient = getQueryClient();
	await queryClient.prefetchQuery({
		...systemStatusQueryOptions,
		queryFn: getSystemStatus,
	});

	return (
		<div className="mx-auto w-full max-w-screen-md">
			<div className="mb-4 flex flex-col gap-1">
				<h1 className="text-3xl font-bold">System</h1>
				<h2 className="text-base text-neutral-600">
					Check for and apply updates to this server.
				</h2>
			</div>
			<HydrationBoundary state={dehydrate(queryClient)}>
				<SystemClient />
			</HydrationBoundary>
		</div>
	);
}
