'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import React from 'react';

import { luggagePackingBoardQueryOptions } from './_data/queries';
import { LuggagePackList } from './luggage-pack-list';

/**
 * The streamed header actions for the luggage packing board — the ready/total tally,
 * derived from the dehydrated cache. Each container toggle invalidates this query so
 * the count stays in sync.
 */
export function LuggagePackingActions({ tripId }: { tripId: string }) {
	const { data: trip } = useSuspenseQuery(
		luggagePackingBoardQueryOptions(tripId),
	);

	const packed = trip.luggageProvisions.reduce((prev, luggageProvision) => {
		const items = luggageProvision.containerProvisions;
		const ready = items.length > 0 && items.every((cp) => cp.packed);
		return prev + (ready ? 1 : 0);
	}, 0);

	const toPack = trip.luggageProvisions.length;

	if (toPack === 0) return null;

	return (
		<span className="text-muted-foreground text-sm tabular-nums">
			<span className="text-foreground font-semibold">{packed}</span> / {toPack}{' '}
			ready
		</span>
	);
}

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

	return <LuggagePackList tripId={tripId} trip={trip} />;
}
