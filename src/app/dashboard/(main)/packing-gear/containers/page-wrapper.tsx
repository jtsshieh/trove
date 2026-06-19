'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { ArrowUpDown } from 'lucide-react';
import { Suspense, useState } from 'react';

import { Skeleton } from '../../../../../components/ui/skeleton';
import { Toggle } from '../../../../../components/ui/toggle';
import { containersQueryOptions } from './_data/queries';
import { CreateContainerDialog } from './container-dialogs';
import { ContainerList } from './container-list';

export function ContainerWrapper() {
	const [sorting, setSorting] = useState(false);

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
					<Toggle
						variant="outline"
						pressed={sorting}
						onPressedChange={(val) => setSorting(val)}
						className="border-neutral-300 hover:bg-neutral-200 data-[state=on]:bg-neutral-200"
					>
						<ArrowUpDown />
					</Toggle>
					<CreateContainerDialog />
				</div>
			</div>
			<Suspense fallback={<ContainerListSkeleton />}>
				<ContainerListContent sorting={sorting} />
			</Suspense>
		</>
	);
}

function ContainerListContent({ sorting }: { sorting: boolean }) {
	const { data: containers } = useSuspenseQuery(containersQueryOptions);
	return <ContainerList containers={containers} sorting={sorting} />;
}

function ContainerListSkeleton() {
	return (
		<div className="grid auto-rows-fr grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			{Array.from({ length: 5 }).map((_, i) => (
				<Skeleton key={i} className="h-32 w-full rounded-xl" />
			))}
		</div>
	);
}
