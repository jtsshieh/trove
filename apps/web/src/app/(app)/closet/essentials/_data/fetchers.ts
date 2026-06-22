import { cache } from 'react';

import { prisma } from '@/lib/db.server';
import { getCurrentUserSafe } from '@/lib/auth';

export const getAllEssentials = cache(async () => {
	const user = await getCurrentUserSafe();
	return prisma.essential.findMany({
		// Honor the user's manual closet order (lexorank), set via drag-to-reorder.
		orderBy: { order: 'asc' },
		where: {
			userId: user.id,
		},
	});
});

export const getAllEssentialGroups = cache(async () => {
	const user = await getCurrentUserSafe();
	return prisma.essentialGroup.findMany({
		where: { userId: user.id },
		orderBy: { order: 'asc' },
		include: {
			items: {
				orderBy: { order: 'asc' },
				include: { essential: true },
			},
		},
	});
});
