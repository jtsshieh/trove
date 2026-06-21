import { scanLuggage } from '@/lib/ai.server';
import { ApiError } from '@/lib/api/errors';
import { prisma } from '@/lib/db.server';
import { rankAfter } from '@/lib/dnd/lexorank';
import { getObject } from '@/lib/storage.server';

import type {
	CreateLuggageInput,
	EditLuggageInput,
	LuggageScanSuggestion,
} from './schemas';

/**
 * Server-side write logic for luggage. Ownership is enforced here (every mutating
 * function takes the caller's `userId` and 404s on a row it doesn't own), replacing
 * the old next-safe-action ownership middleware.
 */

/** The lexorank that appends a new piece after the user's last luggage item. */
async function nextLuggageOrder(userId: string): Promise<string> {
	const last = await prisma.luggage.findFirst({
		where: { userId },
		orderBy: { order: 'desc' },
		select: { order: true },
	});
	return rankAfter(last?.order);
}

/** Loads a luggage row, 404ing if it doesn't belong to `userId`. */
async function requireLuggage(userId: string, id: string) {
	const luggage = await prisma.luggage.findUnique({ where: { id } });
	if (luggage?.userId !== userId) throw new ApiError(404, 'Luggage not found');
	return luggage;
}

export async function createLuggage(userId: string, input: CreateLuggageInput) {
	const order = await nextLuggageOrder(userId);
	return prisma.luggage.create({
		data: {
			name: input.name,
			quantity: input.quantity ?? 1,
			imageKey: input.imageKey,
			order,
			user: { connect: { id: userId } },
		},
	});
}

export async function editLuggage(
	userId: string,
	id: string,
	input: EditLuggageInput,
) {
	const luggage = await requireLuggage(userId, id);
	return prisma.luggage.update({
		where: { id: luggage.id },
		data: {
			name: input.name,
			quantity: input.quantity,
			imageKey: input.imageKey,
		},
	});
}

export async function deleteLuggage(userId: string, id: string) {
	const luggage = await requireLuggage(userId, id);
	await prisma.luggage.delete({ where: { id: luggage.id } });
	return { ok: true as const };
}

export async function scanLuggageImage(
	imageKey: string,
): Promise<{ suggestion: LuggageScanSuggestion | null }> {
	const { body, contentType } = await getObject(imageKey);
	const ext = contentType.split('/')[1] ?? 'webp';
	const suggestion = await scanLuggage(body, ext);
	return { suggestion: (suggestion as LuggageScanSuggestion | null) ?? null };
}

/**
 * Drag-to-reorder a luggage piece. `order` is one lexorank scope per user; the
 * controlled @dnd-kit board computes the new rank from the piece's final neighbours
 * and sends it, so the server just validates ownership + sets it.
 */
export async function reorderLuggage(userId: string, id: string, order: string) {
	const luggage = await requireLuggage(userId, id);
	await prisma.luggage.update({
		where: { id: luggage.id },
		data: { order },
	});
	return { ok: true as const };
}
