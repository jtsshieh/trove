import type {
	Clothing,
	ClothingProvision,
	Container,
	ContainerProvision,
	Essential,
	EssentialProvision,
} from '@/generated/prisma/client';
import { ContainerType } from '@/generated/prisma/enums';
import React from 'react';

import { EmptyList } from '../../../../../../components/empty-list';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '../../../../../../components/ui/card';
import { Progress } from '../../../../../../components/ui/progress';
import { generateClothingName } from '../../../../../../lib/generate-clothing-name';
import { getTripWithContainersPacked } from './_data/fetchers';
import { ClothingPackItem, EssentialPackItem } from './pack-items';

interface ContainerProvisionListProps {
	trip: NonNullable<Awaited<ReturnType<typeof getTripWithContainersPacked>>>;
}

export function ContainerPackList({ trip }: ContainerProvisionListProps) {
	if (trip.containerProvisions.length === 0) {
		return (
			<EmptyList
				main="You have not added any containers to this trip"
				sub="You can start assigning your provisioned items as soon as you add a container."
			/>
		);
	}

	return (
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
			{trip.containerProvisions.map((containerProvision) => (
				<ContainerPackCard
					key={containerProvision.id}
					containerProvision={containerProvision}
				/>
			))}
		</div>
	);
}

function ContainerPackCard({
	containerProvision,
}: {
	containerProvision: ContainerProvision & {
		container: Container;
		clothingProvisions: (ClothingProvision & { clothing: Clothing })[];
		essentialProvisions: (EssentialProvision & { essential: Essential })[];
	};
}) {
	const containerType =
		containerProvision.container.type === ContainerType.Clothes
			? 'clothes'
			: 'essentials';

	const provisions =
		containerType === 'clothes'
			? containerProvision.clothingProvisions
			: containerProvision.essentialProvisions;
	const packed = provisions.reduce(
		(prev, provision) => (provision.packed ? prev + 1 : prev),
		0,
	);
	const toPack = provisions.length;

	return (
		<Card>
			<CardHeader className="flex flex-row items-center gap-2 space-y-0">
				<div className="flex-1">
					<CardTitle>{containerProvision.container.name}</CardTitle>
					<CardDescription>{containerProvision.container.type}</CardDescription>
				</div>
				<div>
					<Progress value={(packed / toPack) * 100} />
					<p className="mt-1 text-neutral-600">
						<span className="text-sm font-bold">
							{packed} / {toPack}
						</span>{' '}
						of provisions packed
					</p>
				</div>
			</CardHeader>
			<CardContent className="flex flex-col">
				{containerType === 'clothes'
					? containerProvision.clothingProvisions.map(
							({ clothing, id, packed }) => (
								<ClothingPackItem
									key={id}
									clothingProvisionId={id}
									clothingName={generateClothingName(clothing)}
									packed={packed}
								/>
							),
						)
					: containerProvision.essentialProvisions.map(
							({ essential, id, packed }) => (
								<EssentialPackItem
									key={id}
									essentialProvisionId={id}
									essentialName={essential.name}
									packed={packed}
								/>
							),
						)}
			</CardContent>
		</Card>
	);
}
