import { HydrationBoundary, dehydrate } from '@tanstack/react-query';

import { getQueryClient } from '@/lib/query-client';

import { containersQueryOptions } from './_data/queries';
import { ContainerWrapper } from './page-wrapper';

export default function ContainersPage() {
	const queryClient = getQueryClient();
	// Non-blocking: kick off the query without awaiting so the page can stream.
	void queryClient.prefetchQuery(containersQueryOptions);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<ContainerWrapper />
		</HydrationBoundary>
	);
}
