'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { Suspense } from 'react';

import { EssentialCategory } from '@/generated/prisma/enums';

import { Skeleton } from '../../../../components/ui/skeleton';
import { essentialsQueryOptions } from './_data/queries';
import { EssentialsList } from './essentials-list';

export function EssentialsListContent() {
	return (
		<Suspense fallback={<EssentialsListSkeleton />}>
			<EssentialsListData />
		</Suspense>
	);
}

function EssentialsListData() {
	const { data: essentials } = useSuspenseQuery(essentialsQueryOptions);
	return <EssentialsList essentials={essentials} />;
}

function EssentialsListSkeleton() {
	return (
		<div className="flex flex-col gap-8">
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
	);
}
