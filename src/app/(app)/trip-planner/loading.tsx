import React from 'react';

import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
	return (
		<div className="flex w-full flex-1 justify-center">
			<div className="flex w-full max-w-screen-lg flex-1 flex-col">
				<div className="mb-4 flex items-center justify-between gap-4 border-b pb-4">
					<div className="flex-1">
						<h1 className="text-3xl font-bold">Trips</h1>
						<h2 className="text-base text-neutral-600">
							These are the trips that you've created.
						</h2>
					</div>
					<Skeleton className="h-9 w-9 sm:w-32" />
				</div>
				<div className="flex flex-col gap-4">
					<Skeleton className="h-[150px] w-full rounded-xl" />
					<Skeleton className="h-[150px] w-full rounded-xl" />
					<Skeleton className="h-[150px] w-full rounded-xl" />
					<Skeleton className="h-[150px] w-full rounded-xl" />
				</div>
			</div>
		</div>
	);
}
