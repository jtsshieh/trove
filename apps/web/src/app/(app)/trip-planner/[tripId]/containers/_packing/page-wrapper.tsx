'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

import { ContainerType } from '@/generated/prisma/enums';

import { ContainerPackList } from './containers-pack-list';
import { containerPackingBoardQueryOptions } from './_data/queries';

/**
 * The streamed header actions for the packing board — the ready/total tally,
 * derived from the dehydrated cache. Packing toggles invalidate this query so the
 * count stays in sync.
 */
export function ContainerPackingActions({ tripId }: { tripId: string }) {
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

	if (toPack === 0) return null;

	return (
		<span className="text-muted-foreground text-sm tabular-nums">
			<span className="text-foreground font-semibold">{packed}</span> / {toPack}{' '}
			ready
		</span>
	);
}

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

	return <ContainerPackList tripId={tripId} trip={trip} />;
}
