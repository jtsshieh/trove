import { prisma } from '@/lib/db.server';

import type { CreateBrandInput, EditBrandInput } from './schemas';

/**
 * Server-side write logic for brands. Brands are a shared taxonomy (no per-user
 * ownership), so these only need an authenticated caller — enforced by the route.
 */

export function createBrand(input: CreateBrandInput) {
	return prisma.brand.create({ data: { name: input.name } });
}

export function editBrand(name: string, input: EditBrandInput) {
	return prisma.brand.update({
		where: { name },
		data: { name: input.name },
	});
}

export async function deleteBrand(name: string) {
	await prisma.brand.delete({ where: { name } });
	return { ok: true as const };
}
