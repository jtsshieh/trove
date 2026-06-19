import type { Clothing, ClothingProvision } from '@/generated/prisma/client';
import { ClothingCategory } from '@/generated/prisma/enums';
import { eachDayOfInterval } from 'date-fns';
import { Shirt } from 'lucide-react';
import { notFound } from 'next/navigation';
import React from 'react';

import {
	getAllClothes,
	getAllClothingTypes,
} from '../../../(main)/wardrobe/_data/fetchers';
import { getTripWithClothingProvisions } from './_data/fetchers';
import { ClothingProvisionList } from './clothing-provision-list';
import { CreateClothingProvisionDialog } from './create-clothing-provision-dialog';

export default async function ClothingProvisionsPage(props: {
	params: Promise<{ tripId: string }>;
}) {
	const params = await props.params;
	const trip = await getTripWithClothingProvisions(params.tripId);

	if (!trip) return notFound();

	const clothes = await getAllClothes();
	const types = await getAllClothingTypes();
	const usedClothes = trip.clothingProvisions.map(
		(provision) => provision.clothing.id,
	);

	const groups: Record<
		string,
		Record<ClothingCategory, (ClothingProvision & { clothing: Clothing })[]>
	> = {};

	for (const day of eachDayOfInterval({ start: trip.start, end: trip.end })) {
		groups[day.toISOString()] = {
			[ClothingCategory.Top]: [],
			[ClothingCategory.Bottom]: [],
			[ClothingCategory.Accessory]: [],
		};
	}

	trip.clothingProvisions.forEach((provision) => {
		groups[provision.day.toISOString()][provision.clothing.type.category].push(
			provision,
		);
	});

	return (
		<>
			<div className="sticky -top-6 mb-4 flex items-center gap-4 rounded-xl bg-neutral-200/75 p-2 backdrop-blur">
				<Shirt className="h-10 w-10" />
				<div className="flex-1">
					<h2 className="text-2xl font-bold">Clothing Provisions</h2>
					<p className="text-base text-neutral-600">
						Provision clothes from your wardrobe to each day of your trip.
					</p>
				</div>
				<CreateClothingProvisionDialog
					clothes={clothes}
					usedClothes={usedClothes}
					trip={trip}
					types={types}
				/>
			</div>
			<ClothingProvisionList
				groups={groups}
				usedClothes={usedClothes}
				tripId={trip.id}
			/>
		</>
	);
}
