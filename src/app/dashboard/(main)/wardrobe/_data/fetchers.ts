import { cache } from 'react';

import { prisma } from '@/lib/db.server';

import { getCurrentUserSafe } from '../../account/_data/fetchers';

export const getAllClothes = cache(async () => {
	const currentUser = await getCurrentUserSafe();

	return prisma.clothing.findMany({
		where: { userId: currentUser.id },
	});
});

export const getAllClothingTypesWithClothes = cache(async () => {
	const currentUser = await getCurrentUserSafe();

	return prisma.clothingType.findMany({
		orderBy: { name: 'asc' },
		include: {
			clothes: {
				where: { userId: currentUser.id },
				// Manual wardrobe order drives the picture-forward grid + drag-reorder.
				orderBy: { order: 'asc' },
			},
		},
	});
});

export const getAllClothingTypes = cache(async () => {
	return prisma.clothingType.findMany({ orderBy: { name: 'asc' } });
});
