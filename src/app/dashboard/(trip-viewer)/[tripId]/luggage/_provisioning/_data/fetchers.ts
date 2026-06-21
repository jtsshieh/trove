import { cache } from 'react';

import { getCurrentUserSafe } from '@/app/dashboard/(main)/account/_data/fetchers';
import { prisma } from '@/lib/db.server';

import { getAllLuggage } from '@/app/dashboard/(main)/packing-gear/luggage/_data/fetchers';

/**
 * The suitcases board: every suitcase with its packed containers (ordered by
 * luggageOrder), plus the pool of containers not yet assigned to a suitcase.
 */
export const getLuggageBoard = cache(async (tripId: string) => {
	const user = await getCurrentUserSafe();

	return prisma.trip.findFirst({
		where: { id: tripId, userId: user.id },
		include: {
			luggageProvisions: {
				orderBy: { luggage: { order: 'asc' } },
				include: {
					luggage: true,
					containerProvisions: {
						include: {
							container: true,
							clothingProvisions: true,
							essentialProvisions: true,
						},
						orderBy: { luggageOrder: 'asc' },
					},
				},
			},
			containerProvisions: {
				where: { luggageProvisionId: null },
				orderBy: { container: { order: 'asc' } },
				include: {
					container: true,
					clothingProvisions: true,
					essentialProvisions: true,
				},
			},
		},
	});
});

export type LuggageBoard = NonNullable<
	Awaited<ReturnType<typeof getLuggageBoard>>
>;

/**
 * The full provisioning board in one shot: the trip's suitcases board plus the
 * user's suitcase catalog (so the "add suitcase" dialog can list ones not yet on
 * the trip). Every board mutation invalidates this single query, so the board and
 * the available-suitcase list refresh together. Null when the trip isn't found.
 */
export const getLuggageProvisioningBoard = cache(async (tripId: string) => {
	const [board, luggage] = await Promise.all([
		getLuggageBoard(tripId),
		getAllLuggage(),
	]);
	if (!board) return null;
	return { board, luggage };
});

export type LuggageProvisioningBoardData = NonNullable<
	Awaited<ReturnType<typeof getLuggageProvisioningBoard>>
>;
