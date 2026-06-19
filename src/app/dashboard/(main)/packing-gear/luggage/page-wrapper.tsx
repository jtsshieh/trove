'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { ArrowUpDown } from 'lucide-react';
import { Suspense, useState } from 'react';

import { Skeleton } from '../../../../../components/ui/skeleton';
import { Toggle } from '../../../../../components/ui/toggle';
import { luggageQueryOptions } from './_data/queries';
import { CreateLuggageDialog } from './luggage-dialogs';
import { LuggageList } from './luggage-list';

export function LuggageWrapper() {
	const [sorting, setSorting] = useState(false);

	return (
		<>
			<div className="mb-4 flex items-center justify-between gap-4">
				<div>
					<p className="text-base text-neutral-600">
						Luggage include any large bags that you bring on a trip like
						suitcases and backpacks.
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
					<CreateLuggageDialog />
				</div>
			</div>
			<Suspense fallback={<LuggageListSkeleton />}>
				<LuggageListContent sorting={sorting} />
			</Suspense>
		</>
	);
}

function LuggageListContent({ sorting }: { sorting: boolean }) {
	const { data: luggage } = useSuspenseQuery(luggageQueryOptions);
	return <LuggageList luggage={luggage} sorting={sorting} />;
}

function LuggageListSkeleton() {
	return (
		<div className="grid auto-rows-fr grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			{Array.from({ length: 5 }).map((_, i) => (
				<Skeleton key={i} className="h-32 w-full rounded-xl" />
			))}
		</div>
	);
}
