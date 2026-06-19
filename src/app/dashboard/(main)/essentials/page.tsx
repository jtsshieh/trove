import { HydrationBoundary, dehydrate } from '@tanstack/react-query';

import { getQueryClient } from '@/lib/query-client';

import { essentialsQueryOptions } from './_data/queries';
import { CreateEssentialDialog } from './essential-dialogs';
import { EssentialsListContent } from './page-wrapper';

export default function EssentialsPage() {
	const queryClient = getQueryClient();
	// Non-blocking: kick off the query without awaiting so the page can stream.
	void queryClient.prefetchQuery(essentialsQueryOptions);

	return (
		<div className="flex w-full flex-1 justify-center">
			<div className="flex w-full max-w-screen-2xl flex-1 flex-col">
				<div className="mb-4 flex items-center justify-between gap-4 border-b pb-4">
					<div className="flex-1">
						<h1 className="text-3xl font-bold">Essentials</h1>
						<h2 className="text-base text-neutral-600">
							These are all the essentials that are registered to the system.
						</h2>
					</div>
					<CreateEssentialDialog />
				</div>
				<HydrationBoundary state={dehydrate(queryClient)}>
					<EssentialsListContent />
				</HydrationBoundary>
			</div>
		</div>
	);
}
