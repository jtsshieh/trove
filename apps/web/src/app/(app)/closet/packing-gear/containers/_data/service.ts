import { scanContainer } from '@/lib/ai.server';
import { ApiError } from '@/lib/api/errors';
import { prisma } from '@/lib/db.server';
import { rankAfter } from '@/lib/dnd/lexorank';
import { ContainerType } from '@/generated/prisma/enums';
import { getObject } from '@/lib/storage.server';

import type {
	ContainerScanSuggestion,
	CreateContainerInput,
	EditContainerInput,
} from './schemas';

/**
 * Server-side write logic for containers. Ownership is enforced here (every
 * mutating function takes the caller's `userId` and 404s on a row it doesn't own),
 * replacing the old next-safe-action ownership middleware.
 */

/** The lexorank that appends a new container after the user's last one. */
async function nextContainerOrder(userId: string): Promise<string> {
	const last = await prisma.container.findFirst({
		where: { userId },
		orderBy: { order: 'desc' },
		select: { order: true },
	});
	return rankAfter(last?.order);
}

/** Loads a container row, 404ing if it doesn't belong to `userId`. */
async function requireContainer(userId: string, id: string) {
	const container = await prisma.container.findUnique({ where: { id } });
	if (container?.userId !== userId) throw new ApiError(404, 'Container not found');
	return container;
}

export async function createContainer(
	userId: string,
	input: CreateContainerInput,
) {
	const { name, type, quantity, imageKey } = input;
	const order = await nextContainerOrder(userId);
	return prisma.container.create({
		data: {
			name,
			type,
			quantity: quantity ?? 1,
			imageKey,
			order,
			user: { connect: { id: userId } },
		},
	});
}

export async function editContainer(
	userId: string,
	id: string,
	input: EditContainerInput,
) {
	const container = await requireContainer(userId, id);
	const { name, type, quantity, imageKey } = input;
	return prisma.container.update({
		where: { id: container.id },
		data: { name, type, quantity, imageKey },
	});
}

export async function deleteContainer(userId: string, id: string) {
	const container = await requireContainer(userId, id);
	await prisma.container.delete({ where: { id: container.id } });
	return { ok: true as const };
}

export async function scanContainerImage(
	imageKey: string,
): Promise<{ suggestion: ContainerScanSuggestion | null }> {
	const { body, contentType } = await getObject(imageKey);
	const ext = contentType.split('/')[1] ?? 'webp';
	const suggestion = await scanContainer(body, ext, Object.keys(ContainerType));
	return { suggestion: (suggestion as ContainerScanSuggestion | null) ?? null };
}

/**
 * Drag-to-reorder a container. `order` is one lexorank scope per user; the
 * controlled @dnd-kit board computes the new rank from the container's final
 * neighbours and sends it, so the server just validates ownership + sets it.
 */
export async function reorderContainer(userId: string, id: string, order: string) {
	const container = await requireContainer(userId, id);
	await prisma.container.update({
		where: { id: container.id },
		data: { order },
	});
	return { ok: true as const };
}
