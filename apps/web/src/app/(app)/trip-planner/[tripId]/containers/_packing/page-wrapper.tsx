'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { Box } from 'lucide-react';

import { ContainerType } from '@/generated/prisma/enums';

import { TripPageHeader } from '../../_components/trip-page-header';
import { ContainerPackList } from './containers-pack-list';
import { containerPackingBoardQueryOptions } from './_data/queries';

/**
 * Reads the dehydrated board cache (container provisions + their packed items) and
 * feeds the packing board island. Packing toggles invalidate this query so the whole
 * board (and its progress tallies) re-derives from one refetch — no prop-drilled
 * server snapshot.
 */
export function ContainerPackingContent({ tripId }: { tripId: string }) {
	const { data: trip } = useSuspenseQuery(
		containerPackingBoardQueryOptions(tripId),
	);

	const packed = trip.containerProvisions.reduce((prev, containerProvision) => {
		const items =
			containerProvision.container.type === ContainerType.Clothes
				? containerProvision.clothingProvisions
				: containerProvision.essentialProvisions;

		const ready =
			items.length > 0 && items.every((provision) => provision.packed);
		return prev + (ready ? 1 : 0);
	}, 0);

	const toPack = trip.containerProvisions.length;

	return (
		<>
			<TripPageHeader
				icon={<Box />}
				title="Pack containers"
				description="Check off each item as it goes into its container."
				actions={
					toPack > 0 && (
						<span className="text-muted-foreground text-sm tabular-nums">
							<span className="text-foreground font-semibold">{packed}</span> /{' '}
							{toPack} ready
						</span>
					)
				}
			/>

			<ContainerPackList tripId={tripId} trip={trip} />
		</>
	);
}
