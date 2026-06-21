import { cache } from 'react';

import { getAllOutfits } from '@/app/(app)/outfits/_data/fetchers';
import { prisma } from '@/lib/db.server';

import { getCurrentUserSafe } from '@/lib/auth';

/**
 * The full clothing board for a trip: every provision (ordered by section → day →
 * dayOrder), the day-scoped outfit groupings, and the per-day notes. The screen
 * derives reuse counts and day buckets from this single normalized payload.
 */
export const getTripClothingBoard = cache(async (tripId: string) => {
	const user = await getCurrentUserSafe();

	return prisma.trip.findFirst({
		where: { id: tripId, userId: user.id },
		include: {
			clothingProvisions: {
				include: { clothing: { include: { type: true } } },
				orderBy: [{ section: 'asc' }, { day: 'asc' }, { dayOrder: 'asc' }],
			},
			tripOutfits: { orderBy: [{ day: 'asc' }, { order: 'asc' }] },
			dayNotes: true,
			clothingBrings: true,
		},
	});
});

export type TripClothingBoard = NonNullable<
	Awaited<ReturnType<typeof getTripClothingBoard>>
>;

/** The wardrobe payload for the closet side-panel (catalog, grouped by type client-side). */
export const getClosetClothing = cache(async () => {
	const user = await getCurrentUserSafe();

	return prisma.clothing.findMany({
		where: { userId: user.id },
		include: { type: true },
		orderBy: [{ typeName: 'asc' }, { brandName: 'asc' }, { color: 'asc' }],
	});
});

/**
 * The full board read in one shot: the trip's clothing board, the closet catalog
 * (for the side-panel + owned-quantity math), and the user's outfit templates
 * (draggable from the closet). Every board mutation invalidates this single query,
 * so all three refresh together. Null when the trip isn't found / owned.
 */
export const getClothingBoardData = cache(async (tripId: string) => {
	const [board, closet, outfits] = await Promise.all([
		getTripClothingBoard(tripId),
		getClosetClothing(),
		getAllOutfits(),
	]);
	if (!board) return null;
	return { board, closet, outfits };
});

export type ClothingBoardData = NonNullable<
	Awaited<ReturnType<typeof getClothingBoardData>>
>;
