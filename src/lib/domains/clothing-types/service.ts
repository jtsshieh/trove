import { ApiError } from '@/lib/api/errors';
import { prisma } from '@/lib/db.server';

import type { ClothingTypeInput } from './schemas';

export async function listClothingTypes() {
	return prisma.clothingType.findMany({ orderBy: { name: 'asc' } });
}

/** Idempotent create/update of clothing types (used by setup + admin). */
export async function createClothingTypes(types: ClothingTypeInput[]) {
	for (const t of types) {
		await prisma.clothingType.upsert({
			where: { name: t.name },
			update: { category: t.category },
			create: t,
		});
	}
	return { created: types.length };
}

/** Delete a clothing type; refuses if any clothing still references it. */
export async function deleteClothingType(name: string) {
	const inUse = await prisma.clothing.count({ where: { typeName: name } });
	if (inUse > 0)
		throw new ApiError(409, `"${name}" is used by ${inUse} item(s)`);
	await prisma.clothingType.delete({ where: { name } });
	return { success: true };
}
