'use client';

import { Luggage } from 'lucide-react';
import { useSuspenseQuery } from '@tanstack/react-query';

import { DisplayToggle } from '@/components/display-mode';
import { Progress } from '@/components/ui/progress';

import { TripPageHeader } from '../../_components/trip-page-header';
import { LuggageBoard } from './luggage-board';
import { CreateSuitcaseDialog } from './_components/create-suitcase-dialog';
import { luggageBoardQueryOptions } from './_data/queries';

/**
 * Reads the dehydrated board cache (suitcases, packed/loose containers, and the
 * available-suitcase catalog) and feeds the board island. Board mutations
 * invalidate this query so the header progress, the add-suitcase list, and the
 * board all re-derive from one refetch — no prop-drilled server snapshot.
 */
export function LuggageProvisioningContent({ tripId }: { tripId: string }) {
	const { data } = useSuspenseQuery(luggageBoardQueryOptions(tripId));
	const { board, luggage } = data;

	const available = luggage.filter(
		(l) => !board.luggageProvisions.some((lp) => lp.luggageId === l.id),
	);

	const assigned = board.luggageProvisions.reduce(
		(a, lp) => a + lp.containerProvisions.length,
		0,
	);
	const total = assigned + board.containerProvisions.length;

	return (
		<>
			<TripPageHeader
				icon={<Luggage />}
				title="Suitcases"
				description="Drag each container into the suitcase it'll be packed in."
				actions={
					<>
						<DisplayToggle />
						<CreateSuitcaseDialog tripId={tripId} luggage={available} />
					</>
				}
			/>

			{total > 0 && (
				<div className="mb-6 flex flex-col gap-1.5">
					<Progress value={total === 0 ? 0 : (assigned / total) * 100}>
						<span className="text-sm font-medium">Containers assigned</span>
						<span className="ml-auto text-sm text-muted-foreground tabular-nums">
							{assigned} / {total}
						</span>
					</Progress>
				</div>
			)}

			<LuggageBoard tripId={tripId} board={board} />
		</>
	);
}
