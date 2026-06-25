import { LexoRank } from 'lexorank';

import { ApiError } from '@/lib/api/errors';
import { prisma } from '@/lib/db.server';
import { rankAfter } from '@/lib/dnd/lexorank';
import { EssentialKind } from '@/generated/prisma/enums';

import { essentialItemFk } from '../../[tripId]/_data/essential-item';
import type {
	CreateEssentialGroupInput,
	EditEssentialGroupInput,
	EssentialItemPick,
} from './schemas';

/**
 * Server-side write logic for reusable Essential-group templates (relocated out of
 * the old essentials catalog). A template bundles polymorphic items — bathroom
 * variants, electronics, documents — that the trip board can import in one shot.
 * Ownership is enforced here (each mutating function takes the caller's `userId` and
 * 404s on a row it doesn't own).
 */

/** Sequential lexoranks for a list of items, starting from the middle. */
function sequentialRanks(count: number): string[] {
	let rank = LexoRank.middle();
	return Array.from({ length: count }, (_, i) =>
		i === 0 ? rank.toString() : (rank = rank.genNext()).toString(),
	);
}

/** Loads an essential group, 404ing if it doesn't belong to `userId`. */
async function requireEssentialGroup(userId: string, id: string) {
	const group = await prisma.essentialGroup.findUnique({ where: { id } });
	if (group?.userId !== userId) throw new ApiError(404, 'Group not found');
	return group;
}

/**
 * Keep only the picks whose polymorphic item the current user actually owns,
 * preserving order. Each app is scoped by `userId`, so a pick survives iff its
 * (kind, itemId) resolves to a user-owned bathroom variant / electronic / document.
 */
async function ownedItemPicks(
	userId: string,
	picks: EssentialItemPick[],
): Promise<EssentialItemPick[]> {
	const byKind = {
		[EssentialKind.Bathroom]: new Set<string>(),
		[EssentialKind.Electronic]: new Set<string>(),
		[EssentialKind.Document]: new Set<string>(),
	};
	for (const pick of picks) byKind[pick.kind].add(pick.itemId);

	const [variants, electronics, documents] = await Promise.all([
		byKind.Bathroom.size
			? prisma.bathroomVariant.findMany({
					where: {
						id: { in: [...byKind.Bathroom] },
						product: { userId },
					},
					select: { id: true },
				})
			: Promise.resolve([]),
		byKind.Electronic.size
			? prisma.electronic.findMany({
					where: { id: { in: [...byKind.Electronic] }, userId },
					select: { id: true },
				})
			: Promise.resolve([]),
		byKind.Document.size
			? prisma.document.findMany({
					where: { id: { in: [...byKind.Document] }, userId },
					select: { id: true },
				})
			: Promise.resolve([]),
	]);

	const owned = {
		[EssentialKind.Bathroom]: new Set(variants.map((v) => v.id)),
		[EssentialKind.Electronic]: new Set(electronics.map((e) => e.id)),
		[EssentialKind.Document]: new Set(documents.map((d) => d.id)),
	};
	return picks.filter((pick) => owned[pick.kind].has(pick.itemId));
}

export async function createEssentialGroup(
	userId: string,
	input: CreateEssentialGroupInput,
) {
	const items = await ownedItemPicks(userId, input.items);
	if (items.length === 0) {
		throw new ApiError(400, 'No valid items selected');
	}

	const last = await prisma.essentialGroup.findFirst({
		where: { userId },
		orderBy: { order: 'desc' },
		select: { order: true },
	});
	const ranks = sequentialRanks(items.length);

	return prisma.essentialGroup.create({
		data: {
			name: input.name,
			order: rankAfter(last?.order),
			user: { connect: { id: userId } },
			items: {
				create: items.map((pick, i) => ({
					...essentialItemFk(pick.kind, pick.itemId),
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

	let items: EssentialItemPick[] | null = null;
	if (input.items) {
		items = await ownedItemPicks(userId, input.items);
	}

	await prisma.$transaction(async (tx) => {
		if (input.name !== undefined) {
			await tx.essentialGroup.update({
				where: { id: group.id },
				data: { name: input.name },
			});
		}
		if (items) {
			await tx.essentialGroupItem.deleteMany({ where: { groupId: group.id } });
			const ranks = sequentialRanks(items.length);
			if (items.length > 0) {
				await tx.essentialGroupItem.createMany({
					data: items.map((pick, i) => ({
						groupId: group.id,
						...essentialItemFk(pick.kind, pick.itemId),
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
