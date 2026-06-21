import { format } from 'date-fns';
import { Search } from 'lucide-react';
import { notFound } from 'next/navigation';
import React from 'react';

import { generateClothingName } from '@/lib/generate-clothing-name';
import { getFullTrip } from '../_data/fetchers';
import { SearchView } from './search-view';
import { SearchResult } from './types';

export default async function SearchPage(props: {
	params: Promise<{ tripId: string }>;
}) {
	const params = await props.params;
	const trip = await getFullTrip(params.tripId);
	if (!trip) return notFound();

	const clothingProvisionSearchResults: SearchResult[] =
		trip.clothingProvisions.map((clothingProvision) => ({
			id: clothingProvision.id,
			type: 'clothing',
			name: generateClothingName(clothingProvision.clothing),
			container: clothingProvision.containerProvision?.container.name,
			luggage:
				clothingProvision.containerProvision?.luggageProvision?.luggage.name,
			otherMatchers: clothingProvision.day
				? [format(clothingProvision.day, 'LLLL dd y')]
				: [],

			clothingDay: clothingProvision.day ?? undefined,
		}));

	const essentialProvisionSearchResults: SearchResult[] =
		trip.essentialProvisions.map((essentialProvision) => ({
			id: essentialProvision.id,
			type: 'essential',
			name: essentialProvision.essential.name,
			container: essentialProvision.containerProvision?.container.name,
			luggage:
				essentialProvision.containerProvision?.luggageProvision?.luggage.name,
			otherMatchers: [essentialProvision.essential.category],

			essentialCategory: essentialProvision.essential.category,
		}));

	const containerProvisionSearchResults: SearchResult[] =
		trip.containerProvisions.map((containerProvision) => ({
			id: containerProvision.id,
			type: 'container',
			name: containerProvision.container.name,
			luggage: containerProvision.luggageProvision?.luggage.name,
			otherMatchers: [],

			containerType: containerProvision.container.type,

			provisionNames: [
				...containerProvision.clothingProvisions.map((provision) =>
					generateClothingName(provision.clothing),
				),
				...containerProvision.essentialProvisions.map(
					(provision) => provision.essential.name,
				),
			],
		}));

	const luggageProvisionSearchResults: SearchResult[] =
		trip.luggageProvisions.map((luggageProvision) => ({
			id: luggageProvision.id,
			type: 'luggage',
			name: luggageProvision.luggage.name,
			otherMatchers: [],

			containers: Object.fromEntries([
				...luggageProvision.containerProvisions.map((containerProvision) => [
					containerProvision.container.name,
					[
						...containerProvision.clothingProvisions.map((provision) =>
							generateClothingName(provision.clothing),
						),
						...containerProvision.essentialProvisions.map(
							(provision) => provision.essential.name,
						),
					],
				]),
			]),
		}));

	const searchResults = [
		...luggageProvisionSearchResults,
		...containerProvisionSearchResults,
		...clothingProvisionSearchResults,
		...essentialProvisionSearchResults,
	];

	return (
		<>
			<div className="mb-4 flex items-center gap-4">
				<Search className="h-10 w-10" />
				<div>
					<h2 className="text-2xl font-bold">Search</h2>
					<p className="text-base text-neutral-600">
						Start typing to quickly find an item and whether or not it was
						packed.
					</p>
				</div>
			</div>
			<SearchView searchResults={searchResults} />
		</>
	);
}
