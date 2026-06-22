import { cache } from 'react';

import { getCurrentUserSafe } from '@/app/(app)/account/_data/fetchers';
import { prisma } from '@/lib/db.server';

import { getAllLuggage } from '@/app/(app)/closet/packing-gear/luggage/_data/fetchers';

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
				orderBy: [{ tripOrder: 'asc' }, { luggage: { order: 'asc' } }],
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
					// Direct ("containerless") items packed straight into this suitcase.
					clothingProvisions: {
						include: { clothing: { include: { type: true } } },
						orderBy: { luggageOrder: 'asc' },
					},
					essentialProvisions: {
						include: { essential: true },
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
			// The pool's direct items: containerless and not yet in a suitcase.
			clothingProvisions: {
				where: { containerless: true, luggageProvisionId: null },
				include: { clothing: { include: { type: true } } },
			},
			essentialProvisions: {
				where: { containerless: true, luggageProvisionId: null },
				include: { essential: true },
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
