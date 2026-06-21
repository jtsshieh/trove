import { cache } from 'react';

import { getCurrentUserSafe } from '@/lib/auth';
import { prisma } from '@/lib/db.server';

/**
 * The full luggage packing board for a trip: every suitcase (luggage provision)
 * ordered by catalog order, each with its assigned containers (container
 * provisions) and their `packed` state. The screen derives per-bag and overall
 * progress from this single normalized payload. Null when the trip isn't owned.
 */
export const getLuggagePackingBoard = cache(async (tripId: string) => {
	const currentUser = await getCurrentUserSafe();

	return prisma.trip.findUnique({
		where: { id: tripId, userId: currentUser.id },
		include: {
			luggageProvisions: {
				orderBy: { luggage: { order: 'asc' } },
				include: {
					containerProvisions: {
						include: {
							clothingProvisions: true,
							essentialProvisions: true,
							container: true,
						},
					},
					luggage: true,
				},
			},
			containerProvisions: {
				orderBy: { container: { order: 'asc' } },
				include: { container: true },
			},
		},
	});
});

export type LuggagePackingBoard = NonNullable<
	Awaited<ReturnType<typeof getLuggagePackingBoard>>
>;
