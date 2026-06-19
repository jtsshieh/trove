import { ContainerType } from '@/generated/prisma/enums';
import { Box } from 'lucide-react';
import { notFound } from 'next/navigation';
import React from 'react';

import { Progress } from '../../../../../../components/ui/progress';
import { getTripWithContainersPacked } from './_data/fetchers';
import { ContainerPackList } from './containers-pack-list';

export async function PackingPage({ tripId }: { tripId: string }) {
	const trip = await getTripWithContainersPacked(tripId);
	if (!trip) return notFound();

	const packed = trip.containerProvisions.reduce((prev, containerProvision) => {
		const containerType =
			containerProvision.container.type === ContainerType.Clothes
				? 'clothes'
				: 'essentials';

		const provisions =
			containerType === 'clothes'
				? containerProvision.clothingProvisions
				: containerProvision.essentialProvisions;

		return prev + (provisions.every((provision) => provision.packed) ? 1 : 0);
	}, 0);

	const toPack = trip.containerProvisions.length;

	return (
		<>
			<div className="mb-4 flex items-center gap-4">
				<Box className="h-10 w-10" />
				<div className="flex-1">
					<h2 className="text-2xl font-bold">Containers Packed</h2>
					<p className="text-base text-neutral-600">
						Mark the provisions you've organized into the containers as packed
						into those containers and track how many provisions and containers
						you still need to pack.
					</p>
				</div>
			</div>
			<div className="mb-4">
				<Progress value={(packed / toPack) * 100} />
				<p className="mt-2 text-neutral-600">
					<span className="font-bold">
						{packed} / {toPack}
					</span>{' '}
					of containers ready to pack
				</p>
			</div>

			<ContainerPackList trip={trip} />
		</>
	);
}
