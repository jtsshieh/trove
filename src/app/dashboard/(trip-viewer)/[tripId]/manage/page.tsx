import { Settings } from 'lucide-react';
import { notFound } from 'next/navigation';
import React from 'react';

import { getTrip } from '../_data/fetchers';
import { ManageTrip } from './manage-trip';

export default async function ManageTripPage(props: {
	params: Promise<{ tripId: string }>;
}) {
	const params = await props.params;
	const trip = await getTrip(params.tripId);
	if (!trip) return notFound();

	return (
		<>
			<div className="mb-4 flex items-center gap-4">
				<Settings className="h-10 w-10" />
				<div>
					<h2 className="text-2xl font-bold">Manage Trip</h2>
					<p className="text-base text-neutral-600">
						Edit details about this trip or delete this trip here.
					</p>
				</div>
			</div>
			<ManageTrip trip={trip} />
		</>
	);
}
