'use client';

import { Package } from 'lucide-react';
import { useSuspenseQuery } from '@tanstack/react-query';

import { DisplayToggle } from '@/components/display-mode';

import { TripPageHeader } from '../../_components/trip-page-header';
import { ContainerBoard } from './container-board';
import { AddContainerDialog } from './_components/add-container-dialog';
import { containerBoardQueryOptions } from './_data/queries';

/**
 * Reads the dehydrated board cache (pool, containers, available catalog) and feeds
 * the board island plus the add-container dialog. Board mutations invalidate this
 * query so the whole view re-derives from one refetch — no prop-drilled server
 * snapshot.
 */
export function ContainerBoardContent({ tripId }: { tripId: string }) {
	const { data } = useSuspenseQuery(containerBoardQueryOptions(tripId));
	const { board, available } = data;

	return (
		<>
			<TripPageHeader
				icon={<Package />}
				title="Containers"
				description="Sort every provisioned item into the bags and cubes you’re bringing."
				actions={
					<>
						<DisplayToggle />
						<AddContainerDialog tripId={tripId} containers={available} />
					</>
				}
			/>
			<ContainerBoard tripId={tripId} board={board} />
		</>
	);
}
