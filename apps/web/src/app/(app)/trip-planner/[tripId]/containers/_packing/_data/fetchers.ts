import { cache } from 'react';

import { getCurrentUserSafe } from '@/app/(app)/account/_data/fetchers';
import { prisma } from '@/lib/db.server';

/**
 * The full container packing board for a trip: every container provision (ordered
 * by the container's catalog order) with its assigned clothing/essential provisions
 * (each carrying its `packed` flag). The screen derives per-container and overall
 * progress from this single normalized payload. Every packing toggle invalidates
 * this one query, so the whole board re-derives from one refetch.
 */
export const getContainerPackingBoard = cache(async (tripId: string) => {
	const currentUser = await getCurrentUserSafe();

	return prisma.trip.findUnique({
		where: { id: tripId, userId: currentUser.id },
		include: {
			containerProvisions: {
				orderBy: { container: { order: 'asc' } },
				include: {
					clothingProvisions: {
						include: { clothing: true },
						orderBy: { containerOrder: 'asc' },
					},
					essentialProvisions: {
						include: { essential: true },
						orderBy: { containerOrder: 'asc' },
					},
					container: true,
				},
			},
		},
	});
});

export type ContainerPackingBoard = NonNullable<
	Awaited<ReturnType<typeof getContainerPackingBoard>>
>;
