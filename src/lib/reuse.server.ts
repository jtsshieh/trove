import { prisma } from '@/lib/db.server';

import { effectiveBringing, type BringMap } from './reuse';

export { effectiveBringing };
export type { BringMap };

/**
 * The effective per-clothing bringing map for a trip: every TripClothingBring
 * override, plus the owned quantity fallback for any clothing the trip touches
 * (provisions today, or future closet entries). Callers pass the clothing ids and
 * their owned quantities so this can fill the no-override default in one place.
 */
export async function getTripBringMap(tripId: string): Promise<BringMap> {
	const rows = await prisma.tripClothingBring.findMany({
		where: { tripId },
		select: { clothingId: true, bringing: true },
	});
	const map: BringMap = new Map();
	for (const row of rows) map.set(row.clothingId, row.bringing);
	return map;
}
