import React from 'react';

import { Skeleton } from '../../../../../../components/ui/skeleton';

export default function Loading() {
	return (
		<div className="flex flex-col">
			<div className="mb-4 flex items-center gap-4">
				<Skeleton className="h-[40px] w-[40px]" />
				<div className="flex flex-1 flex-col gap-1">
					<Skeleton className="h-[32px] w-[250px]" />
					<Skeleton className="w-full text-transparent select-none">
						Choose all the luggage you'll be bringing on this trip and organize
						your selected containers into your selected luggage
					</Skeleton>
				</div>
				<Skeleton className="h-[40px] w-[40px] md:w-[150px]" />
			</div>
			<div className="mb-4">
				<Skeleton className="h-[16px] w-full" />
				<Skeleton className="mt-2 h-[16px] w-full" />
			</div>
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<Skeleton className="h-[300px] w-full rounded-xl" />
				<Skeleton className="h-[300px] w-full rounded-xl" />
				<Skeleton className="h-[300px] w-full rounded-xl" />
				<Skeleton className="h-[300px] w-full rounded-xl" />
			</div>
		</div>
	);
}
