import type { Trip } from '@/generated/prisma/client';
import { format } from 'date-fns';
import Link from 'next/link';
import React from 'react';

import { EmptyList } from '@/components/empty-list';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function TripList({ trips }: { trips: Trip[] }) {
	if (trips.length === 0) {
		return (
			<EmptyList
				main="You have no trips"
				sub="You can create one by clicking the Add Trip button in the top right corner."
			/>
		);
	}
	return (
		<div className="flex flex-col gap-4">
			{trips.map((trip) => (
				<Card key={trip.id}>
					<CardHeader>
						<CardTitle>{trip.name}</CardTitle>
						<CardDescription>
							{format(trip.start, 'LLL dd, y')} -{' '}
							{format(trip.end, 'LLL dd, y')}
						</CardDescription>
					</CardHeader>
					<CardFooter className="justify-end">
						<Button
							nativeButton={false}
							render={<Link href={`/trips/${trip.id}`} />}
						>
							Open
						</Button>
					</CardFooter>
				</Card>
			))}
		</div>
	);
}

export function TripListLoading() {
	return (
		<div className="flex flex-col gap-4">
			<Skeleton className="h-[150px] w-full rounded-xl" />
			<Skeleton className="h-[150px] w-full rounded-xl" />
			<Skeleton className="h-[150px] w-full rounded-xl" />
			<Skeleton className="h-[150px] w-full rounded-xl" />
		</div>
	);
}
