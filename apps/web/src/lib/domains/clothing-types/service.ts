import { ApiError } from '@/lib/api/errors';
import { prisma } from '@/lib/db.server';

import type { ClothingTypeInput } from './schemas';

/**
 * Clothing types are per-user — each caller owns their own catalog — so every
 * function is scoped by the authenticated user's id (threaded from the route).
 */

export async function listClothingTypes(userId: string) {
	return prisma.clothingType.findMany({
		where: { userId },
		orderBy: { name: 'asc' },
	});
}

/** Idempotent create/update of the user's clothing types (used by setup + closet). */
export async function createClothingTypes(
	userId: string,
	types: ClothingTypeInput[],
) {
	for (const t of types) {
		await prisma.clothingType.upsert({
			where: { userId_name: { userId, name: t.name } },
			update: { category: t.category },
			create: { ...t, userId },
		});
	}
	return { created: types.length };
}

/** Delete a user's clothing type; refuses if any of their clothing still uses it. */
export async function deleteClothingType(userId: string, name: string) {
	const inUse = await prisma.clothing.count({
		where: { userId, typeName: name },
	});
	if (inUse > 0)
		throw new ApiError(409, `"${name}" is used by ${inUse} item(s)`);
	await prisma.clothingType.delete({
		where: { userId_name: { userId, name } },
	});
	return { success: true };
}
