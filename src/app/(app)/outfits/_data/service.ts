import { ApiError } from '@/lib/api/errors';
import { prisma } from '@/lib/db.server';
import { rankAfter } from '@/lib/dnd/lexorank';

import type {
	AddOutfitItemInput,
	CreateOutfitInput,
	EditOutfitInput,
} from './schemas';

/**
 * Server-side write logic for outfit templates. Ownership is enforced here (every
 * mutating function takes the caller's `userId` and 404s on a row it doesn't own),
 * replacing the old next-safe-action ownership middleware.
 */

/** Loads an outfit, 404ing if it doesn't belong to `userId`. */
async function requireOutfit(userId: string, id: string) {
	const outfit = await prisma.outfit.findUnique({ where: { id } });
	if (outfit?.userId !== userId) throw new ApiError(404, 'Outfit not found');
	return outfit;
}

export async function createOutfit(userId: string, input: CreateOutfitInput) {
	const { name, imageKey, clothingIds } = input;

	const last = await prisma.outfit.findFirst({
		where: { userId },
		orderBy: { order: 'desc' },
		select: { order: true },
	});

	const uniqueIds = [...new Set(clothingIds)];
	let rank: string | null = null;
	const items = uniqueIds.map((clothingId) => {
		rank = rankAfter(rank);
		return { clothingId, order: rank };
	});

	return prisma.outfit.create({
		data: {
			name,
			imageKey: imageKey ?? null,
			order: rankAfter(last?.order ?? null),
			userId,
			items: { create: items },
		},
	});
}

export async function editOutfit(
	userId: string,
	id: string,
	input: EditOutfitInput,
) {
	const outfit = await requireOutfit(userId, id);
	const { name, imageKey } = input;
	return prisma.outfit.update({
		where: { id: outfit.id },
		data: {
			...(name !== undefined ? { name } : {}),
			...(imageKey !== undefined ? { imageKey: imageKey ?? null } : {}),
		},
	});
}

export async function deleteOutfit(userId: string, id: string) {
	const outfit = await requireOutfit(userId, id);
	await prisma.outfit.delete({ where: { id: outfit.id } });
	return { ok: true as const };
}

export async function addOutfitItem(
	userId: string,
	id: string,
	input: AddOutfitItemInput,
) {
	await requireOutfit(userId, id);
	const last = await prisma.outfitItem.findFirst({
		where: { outfitId: id },
		orderBy: { order: 'desc' },
		select: { order: true },
	});
	await prisma.outfitItem.upsert({
		where: { outfitId_clothingId: { outfitId: id, clothingId: input.clothingId } },
		update: {},
		create: {
			outfitId: id,
			clothingId: input.clothingId,
			order: rankAfter(last?.order ?? null),
		},
	});
	return { ok: true as const };
}

export async function removeOutfitItem(
	userId: string,
	id: string,
	clothingId: string,
) {
	await requireOutfit(userId, id);
	await prisma.outfitItem.deleteMany({ where: { outfitId: id, clothingId } });
	return { ok: true as const };
}

/**
 * Drag-to-reorder an outfit in the library. `order` is one lexorank scope per user;
 * the controlled @dnd-kit board computes the new rank from the outfit's final
 * neighbours and sends it, so the server just validates ownership + sets it.
 */
export async function reorderOutfit(userId: string, id: string, order: string) {
	const outfit = await requireOutfit(userId, id);
	await prisma.outfit.update({
		where: { id: outfit.id },
		data: { order },
	});
	return { ok: true as const };
}
