import { cache } from 'react';

import { getCurrentUserSafe } from '@/app/dashboard/(main)/account/_data/fetchers';
import { getAllEssentialGroups } from '@/app/dashboard/(main)/essentials/_data/fetchers';
import { prisma } from '@/lib/db.server';

/** Essential provisions for a trip, ordered by section → day → dayOrder. */
export const getTripEssentialsBoard = cache(async (tripId: string) => {
	const user = await getCurrentUserSafe();

	return prisma.trip.findFirst({
		where: { id: tripId, userId: user.id },
		include: {
			essentialProvisions: {
				include: { essential: true },
				orderBy: [{ section: 'asc' }, { day: 'asc' }, { dayOrder: 'asc' }],
			},
			tripEssentialGroups: {
				orderBy: { order: 'asc' },
			},
		},
	});
});

export type TripEssentialsBoard = NonNullable<
	Awaited<ReturnType<typeof getTripEssentialsBoard>>
>;

/** The essentials catalog for the add picker. */
export const getClosetEssentials = cache(async () => {
	const user = await getCurrentUserSafe();
	return prisma.essential.findMany({
		where: { userId: user.id },
		orderBy: [{ category: 'asc' }, { name: 'asc' }],
	});
});

/**
 * The full board read in one shot: the trip's essentials board (provisions +
 * sub-groups), the essentials catalog (for the add picker + owned-quantity math),
 * and the user's premade essential groups (the import picker). Every board mutation
 * invalidates this single query, so all three refresh together. Null when the trip
 * isn't found / owned.
 */
export const getEssentialsBoardData = cache(async (tripId: string) => {
	const [board, closet, groups] = await Promise.all([
		getTripEssentialsBoard(tripId),
		getClosetEssentials(),
		getAllEssentialGroups(),
	]);
	if (!board) return null;
	return { board, closet, groups };
});

export type EssentialsBoardData = NonNullable<
	Awaited<ReturnType<typeof getEssentialsBoardData>>
>;
