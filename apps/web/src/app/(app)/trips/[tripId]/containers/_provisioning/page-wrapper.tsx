'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

import { DisplayToggle } from '@/components/display-mode';

import { ContainerBoard } from './container-board';
import { AddContainerDialog } from './_components/add-container-dialog';
import { containerBoardQueryOptions } from './_data/queries';

/**
 * The streamed header actions for the containers board — reads the dehydrated cache
 * for the available-container catalog so the Add dialog can offer free units. Board
 * mutations invalidate this query so the dialog's list stays in sync.
 */
export function ContainerBoardActions({ tripId }: { tripId: string }) {
	const { data } = useSuspenseQuery(containerBoardQueryOptions(tripId));

	return (
		<>
			<DisplayToggle />
			<AddContainerDialog tripId={tripId} containers={data.available} />
		</>
	);
}

/**
 * Reads the dehydrated board cache (pool, containers, available catalog) and feeds
 * the board island. Board mutations invalidate this query so the whole view
 * re-derives from one refetch — no prop-drilled server snapshot.
 */
export function ContainerBoardContent({ tripId }: { tripId: string }) {
	const { data } = useSuspenseQuery(containerBoardQueryOptions(tripId));

	return <ContainerBoard tripId={tripId} board={data.board} />;
}
