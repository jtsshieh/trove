import { prisma } from '@/lib/db.server';

import type { CreateBrandInput, EditBrandInput } from './schemas';

/**
 * Server-side write logic for brands. Brands are per-user — each caller owns their
 * own catalog — so every function is scoped by the authenticated user's id
 * (threaded from the route, matching the clothing service pattern). Deleting a
 * brand cascades to that user's clothing referencing it (see the schema relation).
 */

export function createBrand(userId: string, input: CreateBrandInput) {
	return prisma.brand.create({ data: { name: input.name, userId } });
}

export async function editBrand(
	userId: string,
	name: string,
	input: EditBrandInput,
) {
	// Renaming a brand must also rewrite the denormalized `brandName` on the user's
	// clothes (the id relation is untouched, but the display string would go stale).
	const renaming = input.name && input.name !== name;
	const [, brand] = await prisma.$transaction([
		prisma.clothing.updateMany({
			where: { userId, brandName: name },
			data: renaming ? { brandName: input.name } : {},
		}),
		prisma.brand.update({
			where: { userId_name: { userId, name } },
			data: { name: input.name },
		}),
	]);
	return brand;
}

export async function deleteBrand(userId: string, name: string) {
	await prisma.brand.delete({ where: { userId_name: { userId, name } } });
	return { ok: true as const };
}
