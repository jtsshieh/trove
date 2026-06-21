'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

import { EssentialsBoard } from './essentials-board';
import { essentialsBoardQueryOptions } from './_data/queries';

/**
 * Reads the dehydrated board cache (provisions, sub-groups, closet, premade groups)
 * and feeds the board island. Board mutations invalidate this query so the whole
 * board re-derives from one refetch — no prop-drilled server snapshot.
 */
export function EssentialsBoardContent({ tripId }: { tripId: string }) {
	const { data } = useSuspenseQuery(essentialsBoardQueryOptions(tripId));
	const { board, closet, groups } = data;

	return (
		<EssentialsBoard
			tripId={board.id}
			provisions={board.essentialProvisions}
			subGroups={board.tripEssentialGroups}
			closet={closet}
			groups={groups.map((g) => ({
				id: g.id,
				name: g.name,
				essentialIds: g.items.map((i) => i.essentialId),
			}))}
		/>
	);
}
