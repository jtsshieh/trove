import type { Essential, EssentialProvision } from '@/generated/prisma/client';
import { EssentialCategory } from '@/generated/prisma/enums';
import { PillBottle } from 'lucide-react';
import { notFound } from 'next/navigation';
import React from 'react';

import { getAllEssentials } from '../../../(main)/essentials/_data/fetchers';
import { getTripWithEssentialProvisions } from './_data/fetchers';
import { CreateEssentialProvisionDialog } from './create-essential-provision-dialog';
import { EssentialProvisionList } from './essential-provision-list';

export default async function EssentialProvisionsPage(props: {
	params: Promise<{ tripId: string }>;
}) {
	const params = await props.params;
	const trip = await getTripWithEssentialProvisions(params.tripId);

	if (!trip) return notFound();

	const essentials = await getAllEssentials();

	const groups: Record<
		EssentialCategory,
		(EssentialProvision & { essential: Essential })[]
	> = {
		[EssentialCategory.Toiletry]: [],
		[EssentialCategory.Document]: [],
		[EssentialCategory.Electronic]: [],
	};

	trip.essentialProvisions.forEach((provision) => {
		groups[provision.essential.category].push(provision);
	});

	const usedEssentials = trip.essentialProvisions.map(
		(provision) => provision.essential.id,
	);

	return (
		<>
			<div className="mb-4 flex items-center gap-4">
				<PillBottle className="h-10 w-10" />
				<div className="flex-1">
					<h2 className="text-2xl font-bold">Essentials Provisions</h2>
					<p className="text-base text-neutral-600">
						Provision your essentials to bring on this trip.
					</p>
				</div>
				<CreateEssentialProvisionDialog
					trip={trip}
					essentials={essentials}
					usedEssentials={usedEssentials}
				/>
			</div>
			<EssentialProvisionList groups={groups} />
		</>
	);
}
