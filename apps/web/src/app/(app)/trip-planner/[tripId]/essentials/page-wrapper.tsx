'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

import { DisplayToggle } from '@/components/display-mode';

import {
	AddEssentials,
	AddGroup,
	EssentialsBoard,
	usedEssentialKeys,
} from './essentials-board';
import { essentialsBoardQueryOptions } from './_data/queries';

/**
 * The streamed header actions for the essentials board — the import-group /
 * add-essentials pickers (fed the closet + premade groups from the dehydrated cache)
 * and the display toggle. Board mutations invalidate this query so the pickers stay
 * in sync.
 */
export function EssentialsBoardActions({ tripId }: { tripId: string }) {
	const { data } = useSuspenseQuery(essentialsBoardQueryOptions(tripId));
	const { board, closet, groups } = data;
	const usedKeys = usedEssentialKeys(closet, board.essentialProvisions);

	return (
		<div className="flex items-center gap-2">
			<AddGroup
				tripId={tripId}
				groups={groups.map((g) => ({
					id: g.id,
					name: g.name,
					essentialIds: g.items.map((i) => i.essentialId),
				}))}
			/>
			<AddEssentials tripId={tripId} closet={closet} usedKeys={usedKeys} />
			<DisplayToggle />
		</div>
	);
}

/**
 * Reads the dehydrated board cache (provisions, sub-groups, closet, premade groups)
 * and feeds the board island. Board mutations invalidate this query so the whole
 * board re-derives from one refetch — no prop-drilled server snapshot.
 */
export function EssentialsBoardContent({ tripId }: { tripId: string }) {
	const { data } = useSuspenseQuery(essentialsBoardQueryOptions(tripId));
	const { board } = data;

	return (
		<EssentialsBoard
			tripId={board.id}
			provisions={board.essentialProvisions}
			subGroups={board.tripEssentialGroups}
		/>
	);
}
