import { HydrationBoundary, dehydrate } from '@tanstack/react-query';

import { getQueryClient } from '@/lib/query-client';

import { luggageQueryOptions } from './_data/queries';
import { LuggageWrapper } from './page-wrapper';

export default function LuggagePage() {
	const queryClient = getQueryClient();
	// Non-blocking: kick off the query without awaiting so the page can stream.
	void queryClient.prefetchQuery(luggageQueryOptions);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<LuggageWrapper />
		</HydrationBoundary>
	);
}
