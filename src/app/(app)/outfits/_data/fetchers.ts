import { cache } from 'react';

import { prisma } from '@/lib/db.server';

import { getCurrentUserSafe } from '@/lib/auth';

/** Every saved outfit template with its items, for the builder/library. */
export const getAllOutfits = cache(async () => {
	const user = await getCurrentUserSafe();
	return prisma.outfit.findMany({
		where: { userId: user.id },
		include: {
			items: {
				include: { clothing: { include: { type: true } } },
				orderBy: { order: 'asc' },
			},
		},
		orderBy: { order: 'asc' },
	});
});

export type OutfitWithItems = Awaited<ReturnType<typeof getAllOutfits>>[number];
