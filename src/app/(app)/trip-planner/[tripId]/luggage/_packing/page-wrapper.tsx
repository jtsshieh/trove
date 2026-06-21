'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { Luggage } from 'lucide-react';
import React from 'react';

import { TripPageHeader } from '../../_components/trip-page-header';
import { luggagePackingBoardQueryOptions } from './_data/queries';
import { LuggagePackList } from './luggage-pack-list';

/**
 * Reads the dehydrated luggage packing board cache (suitcases + their containers'
 * packed state) and feeds the list island. Each container toggle invalidates this
 * query so the whole board (and the progress counts) re-derives from one refetch —
 * no prop-drilled server snapshot.
 */
export function LuggagePackingContent({ tripId }: { tripId: string }) {
	const { data: trip } = useSuspenseQuery(
		luggagePackingBoardQueryOptions(tripId),
	);

	const packed = trip.luggageProvisions.reduce((prev, luggageProvision) => {
		const items = luggageProvision.containerProvisions;
		const ready = items.length > 0 && items.every((cp) => cp.packed);
		return prev + (ready ? 1 : 0);
	}, 0);

	const toPack = trip.luggageProvisions.length;

	return (
		<>
			<TripPageHeader
				icon={<Luggage />}
				title="Pack luggage"
				description="Check off each container as it’s secured into your bags."
				actions={
					toPack > 0 && (
						<span className="text-sm text-muted-foreground tabular-nums">
							<span className="font-semibold text-foreground">{packed}</span> /{' '}
							{toPack} ready
						</span>
					)
				}
			/>

			<LuggagePackList tripId={tripId} trip={trip} />
		</>
	);
}
