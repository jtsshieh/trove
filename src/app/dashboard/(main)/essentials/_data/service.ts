import { LexoRank } from 'lexorank';

import { scanEssential } from '@/lib/ai.server';
import { ApiError } from '@/lib/api/errors';
import { prisma } from '@/lib/db.server';
import { rankAfter } from '@/lib/dnd/lexorank';
import { EssentialCategory } from '@/generated/prisma/enums';
import { getObject } from '@/lib/storage.server';

import type {
	CreateEssentialGroupInput,
	CreateEssentialInput,
	EditEssentialGroupInput,
	EditEssentialInput,
	EssentialScanSuggestion,
} from './schemas';

/**
 * Server-side write logic for essentials and essential groups. Ownership is
 * enforced here (every mutating function takes the caller's `userId` and 404s on
 * a row it doesn't own), replacing the old next-safe-action ownership middleware.
 */

/** Sequential lexoranks for a list of items, starting from the middle. */
function sequentialRanks(count: number): string[] {
	let rank = LexoRank.middle();
	return Array.from({ length: count }, (_, i) =>
		i === 0 ? rank.toString() : (rank = rank.genNext()).toString(),
	);
}

/** Loads an essential, 404ing if it doesn't belong to `userId`. */
async function requireEssential(userId: string, id: string) {
	const essential = await prisma.essential.findUnique({ where: { id } });
	if (essential?.userId !== userId) throw new ApiError(404, 'Essential not found');
	return essential;
}

/** Loads an essential group, 404ing if it doesn't belong to `userId`. */
async function requireEssentialGroup(userId: string, id: string) {
	const group = await prisma.essentialGroup.findUnique({ where: { id } });
	if (group?.userId !== userId) throw new ApiError(404, 'Group not found');
	return group;
}

export function createEssential(userId: string, input: CreateEssentialInput) {
	return prisma.essential.create({
		data: {
			name: input.name,
			category: input.category,
			quantity: input.quantity ?? 1,
			imageKey: input.imageKey,
			user: { connect: { id: userId } },
		},
	});
}

export async function createEssentialBatch(
	userId: string,
	items: CreateEssentialInput[],
) {
	// Create independently so one bad row never rolls back the whole batch — the UI
	// keeps failed rows around (with their error) for a retry.
	const results = await Promise.all(
		items.map(async (item, index) => {
			try {
				await prisma.essential.create({
					data: {
						name: item.name,
						category: item.category,
						quantity: item.quantity ?? 1,
						imageKey: item.imageKey,
						user: { connect: { id: userId } },
					},
				});
				return { index, ok: true as const };
			} catch (error) {
				console.error('createEssentialBatch row failed', index, error);
				return { index, ok: false as const };
			}
		}),
	);

	const failed = results.filter((r) => !r.ok).map((r) => r.index);
	return { created: items.length - failed.length, failed };
}

export async function editEssential(
	userId: string,
	id: string,
	input: EditEssentialInput,
) {
	const essential = await requireEssential(userId, id);
	return prisma.essential.update({
		where: { id: essential.id },
		data: {
			name: input.name,
			category: input.category,
			quantity: input.quantity,
			imageKey: input.imageKey,
		},
	});
}

export async function deleteEssential(userId: string, id: string) {
	const essential = await requireEssential(userId, id);
	await prisma.essential.delete({ where: { id: essential.id } });
	return { ok: true as const };
}

export async function scanEssentialImage(
	imageKey: string,
): Promise<{ suggestion: EssentialScanSuggestion | null }> {
	const { body, contentType } = await getObject(imageKey);
	const ext = contentType.split('/')[1] ?? 'webp';
	const suggestion = await scanEssential(
		body,
		ext,
		Object.keys(EssentialCategory),
	);
	return { suggestion: (suggestion as EssentialScanSuggestion | null) ?? null };
}

/** Keep only the essential ids the current user actually owns, preserving order. */
async function ownedEssentialIds(userId: string, ids: string[]) {
	const owned = await prisma.essential.findMany({
		where: { id: { in: ids }, userId },
		select: { id: true },
	});
	const ownedSet = new Set(owned.map((e) => e.id));
	return ids.filter((id) => ownedSet.has(id));
}

/** A group holds one type — true if every id is the same essential category. */
async function isSingleCategory(ids: string[]) {
	if (ids.length <= 1) return true;
	const rows = await prisma.essential.findMany({
		where: { id: { in: ids } },
		select: { category: true },
	});
	return new Set(rows.map((r) => r.category)).size <= 1;
}

export async function createEssentialGroup(
	userId: string,
	input: CreateEssentialGroupInput,
) {
	const ids = await ownedEssentialIds(userId, input.essentialIds);
	if (ids.length === 0) {
		throw new ApiError(400, 'No valid essentials selected');
	}
	if (!(await isSingleCategory(ids))) {
		throw new ApiError(400, 'A group can only hold one type of essential');
	}

	const last = await prisma.essentialGroup.findFirst({
		where: { userId },
		orderBy: { order: 'desc' },
		select: { order: true },
	});
	const ranks = sequentialRanks(ids.length);

	return prisma.essentialGroup.create({
		data: {
			name: input.name,
			order: rankAfter(last?.order),
			user: { connect: { id: userId } },
			items: {
				create: ids.map((essentialId, i) => ({
					essentialId,
					order: ranks[i],
				})),
			},
		},
	});
}

export async function editEssentialGroup(
	userId: string,
	id: string,
	input: EditEssentialGroupInput,
) {
	const group = await requireEssentialGroup(userId, id);

	let ids: string[] | null = null;
	if (input.essentialIds) {
		ids = await ownedEssentialIds(userId, input.essentialIds);
		if (!(await isSingleCategory(ids))) {
			throw new ApiError(400, 'A group can only hold one type of essential');
		}
	}

	await prisma.$transaction(async (tx) => {
		if (input.name !== undefined) {
			await tx.essentialGroup.update({
				where: { id: group.id },
				data: { name: input.name },
			});
		}
		if (ids) {
			await tx.essentialGroupItem.deleteMany({ where: { groupId: group.id } });
			const ranks = sequentialRanks(ids.length);
			if (ids.length > 0) {
				await tx.essentialGroupItem.createMany({
					data: ids.map((essentialId, i) => ({
						groupId: group.id,
						essentialId,
						order: ranks[i],
					})),
				});
			}
		}
	});

	return { ok: true as const };
}

export async function deleteEssentialGroup(userId: string, id: string) {
	const group = await requireEssentialGroup(userId, id);
	await prisma.essentialGroup.delete({ where: { id: group.id } });
	return { ok: true as const };
}
