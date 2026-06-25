'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

import { DisplayToggle } from '@/components/display-mode';
import { Progress } from '@/components/ui/progress';

import { LuggageBoard } from './luggage-board';
import { CreateSuitcaseDialog } from './_components/create-suitcase-dialog';
import { luggageBoardQueryOptions } from './_data/queries';

/**
 * The streamed header actions for the suitcases board — reads the dehydrated cache
 * for the available-suitcase catalog so the Add dialog can offer free units. Board
 * mutations invalidate this query so the dialog's list stays in sync.
 */
export function LuggageProvisioningActions({ tripId }: { tripId: string }) {
	const { data } = useSuspenseQuery(luggageBoardQueryOptions(tripId));
	const { board, luggage } = data;

	// Offer a suitcase while the user still has units of it free (owned quantity
	// minus how many are already on this trip). Each unit becomes its own card.
	const onTrip = new Map<string, number>();
	for (const lp of board.luggageProvisions)
		onTrip.set(lp.luggageId, (onTrip.get(lp.luggageId) ?? 0) + 1);
	const available = luggage
		.map((l) => ({ ...l, remaining: l.quantity - (onTrip.get(l.id) ?? 0) }))
		.filter((l) => l.remaining > 0);

	return (
		<>
			<DisplayToggle />
			<CreateSuitcaseDialog tripId={tripId} luggage={available} />
		</>
	);
}

/**
 * Reads the dehydrated board cache (suitcases, packed/loose containers, and the
 * available-suitcase catalog) and feeds the board island plus the assigned-progress
 * bar. Board mutations invalidate this query so the progress and the board all
 * re-derive from one refetch — no prop-drilled server snapshot.
 */
export function LuggageProvisioningContent({ tripId }: { tripId: string }) {
	const { data } = useSuspenseQuery(luggageBoardQueryOptions(tripId));
	const { board } = data;

	// Progress counts everything that needs a suitcase: containers AND direct
	// ("containerless") clothing/essentials. Assigned = those already in a suitcase;
	// total adds the loose ones still waiting in the pool.
	const assigned = board.luggageProvisions.reduce(
		(a, lp) =>
			a +
			lp.containerProvisions.length +
			lp.clothingProvisions.length +
			lp.essentialProvisions.length,
		0,
	);
	const looseDirect =
		board.clothingProvisions.length + board.essentialProvisions.length;
	const total = assigned + board.containerProvisions.length + looseDirect;

	return (
		<>
			{total > 0 && (
				<div className="mb-6 flex flex-col gap-1.5">
					<Progress value={total === 0 ? 0 : (assigned / total) * 100}>
						<span className="text-sm font-medium">Assigned to suitcases</span>
						<span className="text-muted-foreground ml-auto text-sm tabular-nums">
							{assigned} / {total}
						</span>
					</Progress>
				</div>
			)}

			<LuggageBoard tripId={tripId} board={board} />
		</>
	);
}
