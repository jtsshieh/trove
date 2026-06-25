import { cache } from 'react';

import { getCurrentUserSafe } from '@/lib/auth';
import { prisma } from '@/lib/db.server';

import type { VariantStock } from './schemas';

/**
 * Server-side reads for the bathroom domain. Each is `cache()`d (request-scoped
 * dedupe) and scoped to the authenticated user, matching the essentials fetchers.
 */

/**
 * All of the user's products (with ordered variants) plus a per-variant on-hand
 * breakdown. On-hand = units that aren't Gone; the breakdown counts InStock / InUse
 * / Dirty so the catalog can show stock + low-stock badges without a second query.
 */
export const getAllBathroomProducts = cache(async () => {
	const user = await getCurrentUserSafe();

	const [products, grouped] = await Promise.all([
		prisma.bathroomProduct.findMany({
			where: { userId: user.id },
			// Honor the user's manual catalog order (lexorank), set via drag-to-reorder.
			orderBy: { order: 'asc' },
			include: { variants: { orderBy: { order: 'asc' } } },
		}),
		// One pass over the user's units, grouped by variant + state, so per-variant
		// stock is O(states) to assemble instead of N queries.
		prisma.bathroomUnit.groupBy({
			by: ['variantId', 'state'],
			where: { userId: user.id },
			_count: { _all: true },
		}),
	]);

	const stockByVariant = new Map<string, VariantStock>();
	for (const row of grouped) {
		const entry =
			stockByVariant.get(row.variantId) ??
			({ onHand: 0, inStock: 0, inUse: 0, dirty: 0 } satisfies VariantStock);
		const count = row._count._all;
		if (row.state === 'InStock') entry.inStock += count;
		if (row.state === 'InUse') entry.inUse += count;
		if (row.state === 'Dirty') entry.dirty += count;
		// Anything that isn't Gone counts toward what you physically still own.
		if (row.state !== 'Gone') entry.onHand += count;
		stockByVariant.set(row.variantId, entry);
	}

	return products.map((product) => ({
		...product,
		variants: product.variants.map((variant) => ({
			...variant,
			stock:
				stockByVariant.get(variant.id) ??
				({ onHand: 0, inStock: 0, inUse: 0, dirty: 0 } satisfies VariantStock),
		})),
	}));
});

export const getAllBathroomTypes = cache(async () => {
	const user = await getCurrentUserSafe();
	return prisma.bathroomType.findMany({
		where: { userId: user.id },
		orderBy: { name: 'asc' },
	});
});

/**
 * The user's units, newest checkout first, each carrying its variant + product so
 * the check-out board can render nature-appropriate actions and labels. Gone units
 * are excluded — they're history, surfaced via batches, not the live stock board.
 */
export const getAllBathroomUnits = cache(async () => {
	const user = await getCurrentUserSafe();
	return prisma.bathroomUnit.findMany({
		where: { userId: user.id, state: { not: 'Gone' } },
		orderBy: [{ checkedOutAt: 'desc' }, { id: 'asc' }],
		include: { variant: { include: { product: true } } },
	});
});

/** The user's acquisitions, newest first, each carrying its variant + product. */
export const getAllBathroomBatches = cache(async () => {
	const user = await getCurrentUserSafe();
	return prisma.bathroomBatch.findMany({
		where: { userId: user.id },
		orderBy: { acquiredAt: 'desc' },
		include: { variant: { include: { product: true } } },
	});
});
