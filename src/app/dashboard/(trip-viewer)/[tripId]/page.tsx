import { notFound } from 'next/navigation';

import { getTrip } from './_data/fetchers';

export default async function TripPage(props: {
	params: Promise<{ tripId: string }>;
}) {
	const params = await props.params;
	const trip = await getTrip(params.tripId);
	if (!trip) return notFound();

	return (
		<>
			<h2 className="text-2xl font-bold">
				Welcome to the provisioning dashboard in the packing list trip planner!
			</h2>
			<p className="text-base text-neutral-700">
				Here's a brief overview of all the important information.
			</p>
		</>
	);
}
