'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { Suspense } from 'react';

import { ElectronicKind } from '@/generated/prisma/enums';

import { Skeleton } from '@/components/ui/skeleton';

import { electronicsQueryOptions } from './_data/queries';
import { ElectronicsList } from './electronics-list';

export function ElectronicsListContent() {
	return (
		<Suspense fallback={<ElectronicsListSkeleton />}>
			<ElectronicsListData />
		</Suspense>
	);
}

function ElectronicsListData() {
	const { data: electronics } = useSuspenseQuery(electronicsQueryOptions);
	return <ElectronicsList electronics={electronics} />;
}

function ElectronicsListSkeleton() {
	return (
		<div className="flex flex-col gap-8">
			{Object.values(ElectronicKind).map((kind) => (
				<div key={kind}>
					<Skeleton className="mb-2 h-7 w-40" />
					<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
						{Array.from({ length: 5 }).map((_, i) => (
							<Skeleton key={i} className="h-32 w-full rounded-xl" />
						))}
					</div>
				</div>
			))}
		</div>
	);
}
