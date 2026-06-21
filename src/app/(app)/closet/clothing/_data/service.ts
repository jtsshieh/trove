import { LexoRank } from 'lexorank';

import { scanClothing, type ClothingTaxonomy } from '@/lib/ai.server';
import { ApiError } from '@/lib/api/errors';
import { prisma } from '@/lib/db.server';
import { rankAfter } from '@/lib/dnd/lexorank';
import { getObject } from '@/lib/storage.server';

import { colors } from '../constants';
import type {
	ClothingScanSuggestion,
	CreateClothingInput,
	EditClothingInput,
} from './schemas';

/**
 * Server-side write logic for clothing. Ownership is enforced here (every mutating
 * function takes the caller's `userId` and 404s on a row it doesn't own), replacing
 * the old next-safe-action ownership middleware.
 */

/** A scanned type may be new — connect if it exists, otherwise create with its category. */
function typeUpsert(type: string, typeCategory?: 'Top' | 'Bottom' | 'Accessory') {
	return {
		connectOrCreate: {
			where: { name: type },
			create: { name: type, category: typeCategory ?? 'Accessory' },
		},
	};
}

/** The lexorank that appends a new piece after the user's last wardrobe item. */
async function nextClothingOrder(userId: string): Promise<string> {
	const last = await prisma.clothing.findFirst({
		where: { userId },
		orderBy: { order: 'desc' },
		select: { order: true },
	});
	return rankAfter(last?.order);
}

/** Persists one clothing row for `userId`, upserting its brand/type. */
function persistClothing(
	userId: string,
	input: CreateClothingInput,
	order: string,
) {
	const { brandLine, color, modifier, quantity, type, typeCategory, brand, imageKey } =
		input;
	return prisma.clothing.create({
		data: {
			brandLine,
			color,
			modifier,
			quantity: quantity ?? 1,
			imageKey,
			order,
			user: { connect: { id: userId } },
			type: typeUpsert(type, typeCategory),
			brand: {
				connectOrCreate: {
					where: { name: brand },
					create: { name: brand },
				},
			},
		},
	});
}

/** Loads a clothing row, 404ing if it doesn't belong to `userId`. */
async function requireClothing(userId: string, id: string) {
	const clothing = await prisma.clothing.findUnique({ where: { id } });
	if (clothing?.userId !== userId) throw new ApiError(404, 'Clothing not found');
	return clothing;
}

export function createClothing(userId: string, input: CreateClothingInput) {
	return nextClothingOrder(userId).then((order) =>
		persistClothing(userId, input, order),
	);
}

export async function createClothingBatch(
	userId: string,
	items: CreateClothingInput[],
) {
	// Pre-create the distinct brands/types up front. The concurrent creates below
	// each do a brand/type `connectOrCreate`; if two rows share the SAME new brand
	// or type they'd race and both try to insert it, violating the unique `name`
	// constraint (P2002). Seeding them first means every row just connects.
	const brandNames = [...new Set(items.map((i) => i.brand.trim()))].filter(Boolean);
	const typeMap = new Map<string, 'Top' | 'Bottom' | 'Accessory'>();
	for (const item of items) {
		const name = item.type.trim();
		if (name && !typeMap.has(name)) {
			typeMap.set(name, item.typeCategory ?? 'Accessory');
		}
	}
	await Promise.all([
		prisma.brand.createMany({
			data: brandNames.map((name) => ({ name })),
			skipDuplicates: true,
		}),
		prisma.clothingType.createMany({
			data: [...typeMap].map(([name, category]) => ({ name, category })),
			skipDuplicates: true,
		}),
	]);

	// Pre-compute one ascending lexorank per row (appended after the user's current
	// last piece) so the concurrent creates below don't collide on order.
	let rank = LexoRank.parse(await nextClothingOrder(userId));
	const orders = items.map((_, i) =>
		i === 0 ? rank.toString() : (rank = rank.genNext()).toString(),
	);

	// Create independently so one bad row never rolls back the whole batch — the UI
	// keeps failed rows around (with their error) for a retry.
	const results = await Promise.all(
		items.map(async (item, index) => {
			try {
				await persistClothing(userId, item, orders[index]);
				return { index, ok: true as const };
			} catch (error) {
				console.error('createClothingBatch row failed', index, error);
				return { index, ok: false as const };
			}
		}),
	);

	const failed = results.filter((r) => !r.ok).map((r) => r.index);
	return { created: items.length - failed.length, failed };
}

export async function editClothing(
	userId: string,
	id: string,
	input: EditClothingInput,
) {
	const clothing = await requireClothing(userId, id);
	const { brandLine, color, modifier, quantity, type, typeCategory, brand, imageKey } =
		input;

	const payload = { brandLine, color, modifier, quantity, imageKey };
	if (type) Object.assign(payload, { type: typeUpsert(type, typeCategory) });
	if (brand) {
		Object.assign(payload, {
			brand: {
				connectOrCreate: { where: { name: brand }, create: { name: brand } },
			},
		});
	}

	return prisma.clothing.update({ where: { id: clothing.id }, data: payload });
}

export async function deleteClothing(userId: string, id: string) {
	const clothing = await requireClothing(userId, id);
	await prisma.clothing.delete({ where: { id: clothing.id } });
	return { ok: true as const };
}

/**
 * Drag-to-reorder a wardrobe piece. `order` is one lexorank scope per user; the
 * controlled @dnd-kit board computes the new rank from the piece's final neighbours
 * within its type group and sends it, so the server just validates ownership + sets it.
 */
export async function reorderClothing(userId: string, id: string, order: string) {
	const clothing = await requireClothing(userId, id);
	await prisma.clothing.update({
		where: { id: clothing.id },
		data: { order },
	});
	return { ok: true as const };
}

export async function scanClothingImage(
	imageKey: string,
): Promise<{ suggestion: ClothingScanSuggestion | null }> {
	const [types, brands, { body, contentType }] = await Promise.all([
		prisma.clothingType.findMany({
			select: { name: true, category: true },
			orderBy: { name: 'asc' },
		}),
		prisma.brand.findMany({ select: { name: true }, orderBy: { name: 'asc' } }),
		getObject(imageKey),
	]);

	const taxonomy: ClothingTaxonomy = {
		types: types.map((t) => ({ name: t.name, category: t.category })),
		brands: brands.map((b) => b.name),
		colors,
	};

	const ext = contentType.split('/')[1] ?? 'webp';
	const suggestion = await scanClothing(body, ext, taxonomy);
	return { suggestion: (suggestion as ClothingScanSuggestion | null) ?? null };
}
