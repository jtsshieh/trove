import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { getQueryClient } from '@/lib/query-client';

import {
	getAllBathroomProducts,
	getAllBathroomTypes,
	getAllBathroomUnits,
} from '../_data/fetchers';
import {
	bathroomProductsQueryOptions,
	bathroomTypesQueryOptions,
	bathroomUnitsQueryOptions,
} from '../_data/queries';

/**
 * Shared server shell for each bathroom section page (Catalog / Consumables /
 * Appliances / Launderables — now top-bar tabs, one route each). Paints the header
 * instantly and fires the catalog/units/types prefetches WITHOUT awaiting, so each
 * section's content streams in via its own client Suspense boundary.
 */
export function BathroomSection({
	title,
	subtitle,
	actions,
	children,
}: {
	title: string;
	subtitle: string;
	actions?: ReactNode;
	children: ReactNode;
}) {
	const queryClient = getQueryClient();
	void queryClient.prefetchQuery({
		queryKey: bathroomProductsQueryOptions.queryKey,
		queryFn: getAllBathroomProducts,
	});
	void queryClient.prefetchQuery({
		queryKey: bathroomUnitsQueryOptions.queryKey,
		queryFn: getAllBathroomUnits,
	});
	void queryClient.prefetchQuery({
		queryKey: bathroomTypesQueryOptions.queryKey,
		queryFn: getAllBathroomTypes,
	});

	return (
		<div className="flex w-full flex-1 justify-center">
			<div className="flex w-full max-w-screen-2xl flex-1 flex-col">
				<div className="mb-4 flex items-start justify-between gap-4 border-b pb-4">
					<div className="flex flex-col gap-1">
						<h1 className="text-3xl font-bold">{title}</h1>
						<h2 className="text-base text-neutral-600">{subtitle}</h2>
					</div>
					{actions && (
						<div className="flex shrink-0 items-center gap-2">{actions}</div>
					)}
				</div>
				<HydrationBoundary state={dehydrate(queryClient)}>
					{children}
				</HydrationBoundary>
			</div>
		</div>
	);
}
