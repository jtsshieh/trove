import { LexoRank } from 'lexorank';

import { scanBathroom } from '@/lib/ai.server';
import { ApiError } from '@/lib/api/errors';
import { prisma } from '@/lib/db.server';
import { rankAfter } from '@/lib/dnd/lexorank';
import { getObject } from '@/lib/storage.server';

import type {
	AddBathroomBatchInput,
	BathroomScanSuggestion,
	CreateBathroomProductInput,
	CreateBathroomTypeInput,
	CreateBathroomVariantInput,
	EditBathroomProductInput,
	EditBathroomTypeInput,
	EditBathroomVariantInput,
} from './schemas';

/**
 * Server-side write logic for the bathroom domain. Ownership is enforced here
 * (every mutating function takes the caller's `userId` and 404s on a row it doesn't
 * own), mirroring the essentials/clothing services. Unit lifecycle transitions and
 * batch acquisition run inside `prisma.$transaction` so the unit ledger stays
 * consistent.
 */

/** Sequential lexoranks for a list of items, starting from the middle. */
function sequentialRanks(count: number): string[] {
	let rank = LexoRank.middle();
	return Array.from({ length: count }, (_, i) =>
		i === 0 ? rank.toString() : (rank = rank.genNext()).toString(),
	);
}

/**
 * Connects a product to its (per-user) brand, creating it if the user doesn't own
 * it yet and tagging the brand with the `Bathroom` domain. Matched by the
 * `userId_name` composite so two users can own the same brand. Mirrors the clothing
 * `brandConnectOrCreate` but adds the domain so the brand picker can filter.
 */
function brandConnectOrCreate(userId: string, brand: string) {
	return {
		connectOrCreate: {
			where: { userId_name: { userId, name: brand } },
			create: {
				name: brand,
				domains: ['Bathroom' as const],
				user: { connect: { id: userId } },
			},
		},
	};
}

/**
 * Connects a product to its (per-user) type, creating it if the user doesn't own
 * it yet. Matched by the `userId_name` composite (per-user catalog).
 */
function typeConnectOrCreate(userId: string, type: string) {
	return {
		connectOrCreate: {
			where: { userId_name: { userId, name: type } },
			create: { name: type, user: { connect: { id: userId } } },
		},
	};
}

/**
 * Ensures the user's brand carries the `Bathroom` domain. `connectOrCreate` only
 * sets domains when it CREATES the brand — an existing Closet/Electronics brand
 * being reused for a bathroom product needs the domain pushed on separately.
 */
async function ensureBrandDomain(userId: string, brand: string) {
	const existing = await prisma.brand.findUnique({
		where: { userId_name: { userId, name: brand } },
		select: { domains: true },
	});
	if (existing && !existing.domains.includes('Bathroom')) {
		await prisma.brand.update({
			where: { userId_name: { userId, name: brand } },
			data: { domains: { push: 'Bathroom' } },
		});
	}
}

/** Next lexorank after the user's last product (appends to the catalog order). */
async function nextProductRank(userId: string) {
	const last = await prisma.bathroomProduct.findFirst({
		where: { userId },
		orderBy: { order: 'desc' },
		select: { order: true },
	});
	return rankAfter(last?.order ?? null);
}

/** Loads a product, 404ing if it doesn't belong to `userId`. */
async function requireProduct(userId: string, id: string) {
	const product = await prisma.bathroomProduct.findUnique({ where: { id } });
	if (product?.userId !== userId) throw new ApiError(404, 'Product not found');
	return product;
}

/** Loads a variant (with its product), 404ing if not owned by `userId`. */
async function requireVariant(userId: string, id: string) {
	const variant = await prisma.bathroomVariant.findUnique({
		where: { id },
		include: { product: true },
	});
	if (!variant || variant.product.userId !== userId)
		throw new ApiError(404, 'Variant not found');
	return variant;
}

/** Loads a batch, 404ing if it doesn't belong to `userId`. */
async function requireBatch(userId: string, id: string) {
	const batch = await prisma.bathroomBatch.findUnique({ where: { id } });
	if (batch?.userId !== userId) throw new ApiError(404, 'Batch not found');
	return batch;
}

export async function createBathroomProduct(
	userId: string,
	input: CreateBathroomProductInput,
) {
	if (input.brand) await ensureBrandDomain(userId, input.brand);
	const order = await nextProductRank(userId);
	const variantRanks = sequentialRanks(input.variants.length);

	return prisma.bathroomProduct.create({
		data: {
			name: input.name,
			nature: input.nature,
			// Form is only meaningful for consumables; drop it for the rest.
			form: input.nature === 'Consumable' ? (input.form ?? null) : null,
			notes: input.notes ?? null,
			imageKey: input.imageKey ?? null,
			order,
			typeName: input.type ?? null,
			brandName: input.brand ?? null,
			user: { connect: { id: userId } },
			type: input.type ? typeConnectOrCreate(userId, input.type) : undefined,
			brand: input.brand
				? brandConnectOrCreate(userId, input.brand)
				: undefined,
			variants: {
				create: input.variants.map((v, i) => ({
					label: v.label ?? null,
					capacityMl: v.capacityMl ?? null,
					order: variantRanks[i],
				})),
			},
		},
		include: { variants: { orderBy: { order: 'asc' } } },
	});
}

/**
 * LLM scan-to-fill: read one uploaded photo and suggest a product's
 * name/nature/form/type/brand. Loads the user's bathroom types + Bathroom-domain
 * brands as a taxonomy so the model prefers existing values, then calls the
 * best-effort `scanBathroom` (returns null on any failure so the form is simply
 * left blank for manual entry).
 */
export async function scanBathroomImage(
	userId: string,
	imageKey: string,
): Promise<{ suggestion: BathroomScanSuggestion | null }> {
	const [types, brands, { body, contentType }] = await Promise.all([
		prisma.bathroomType.findMany({
			where: { userId },
			select: { name: true },
			orderBy: { name: 'asc' },
		}),
		prisma.brand.findMany({
			where: { userId, domains: { has: 'Bathroom' } },
			select: { name: true },
			orderBy: { name: 'asc' },
		}),
		getObject(imageKey),
	]);

	const ext = contentType.split('/')[1] ?? 'webp';
	const suggestion = await scanBathroom(body, ext, {
		types: types.map((t) => t.name),
		brands: brands.map((b) => b.name),
	});
	return { suggestion: (suggestion as BathroomScanSuggestion | null) ?? null };
}

export async function editBathroomProduct(
	userId: string,
	id: string,
	input: EditBathroomProductInput,
) {
	const product = await requireProduct(userId, id);
	if (input.brand) await ensureBrandDomain(userId, input.brand);

	const nature = input.nature ?? product.nature;
	const payload: Record<string, unknown> = {
		name: input.name,
		nature: input.nature,
		notes: input.notes,
		imageKey: input.imageKey,
	};
	// Keep `form` consistent with nature: only consumables carry one.
	if (input.form !== undefined || input.nature !== undefined) {
		payload.form = nature === 'Consumable' ? (input.form ?? null) : null;
	}
	if (input.type !== undefined) {
		payload.typeName = input.type;
		payload.type = input.type
			? typeConnectOrCreate(userId, input.type)
			: { disconnect: true };
	}
	if (input.brand !== undefined) {
		payload.brandName = input.brand;
		payload.brand = input.brand
			? brandConnectOrCreate(userId, input.brand)
			: { disconnect: true };
	}

	return prisma.bathroomProduct.update({
		where: { id: product.id },
		data: payload,
		include: { variants: { orderBy: { order: 'asc' } } },
	});
}

export async function deleteBathroomProduct(userId: string, id: string) {
	const product = await requireProduct(userId, id);
	await prisma.bathroomProduct.delete({ where: { id: product.id } });
	return { ok: true as const };
}

/** Drag-to-reorder: persist a single product's new lexorank in the catalog order. */
export async function reorderBathroomProduct(
	userId: string,
	id: string,
	order: string,
) {
	const product = await requireProduct(userId, id);
	await prisma.bathroomProduct.update({
		where: { id: product.id },
		data: { order },
	});
	return { ok: true as const };
}

/** Next lexorank after a product's last variant. */
async function nextVariantRank(productId: string) {
	const last = await prisma.bathroomVariant.findFirst({
		where: { productId },
		orderBy: { order: 'desc' },
		select: { order: true },
	});
	return rankAfter(last?.order ?? null);
}

export async function addBathroomVariant(
	userId: string,
	productId: string,
	input: CreateBathroomVariantInput,
) {
	const product = await requireProduct(userId, productId);
	return prisma.bathroomVariant.create({
		data: {
			label: input.label ?? null,
			capacityMl: input.capacityMl ?? null,
			order: await nextVariantRank(product.id),
			product: { connect: { id: product.id } },
		},
	});
}

export async function editBathroomVariant(
	userId: string,
	id: string,
	input: EditBathroomVariantInput,
) {
	const variant = await requireVariant(userId, id);
	return prisma.bathroomVariant.update({
		where: { id: variant.id },
		data: { label: input.label, capacityMl: input.capacityMl },
	});
}

export async function deleteBathroomVariant(userId: string, id: string) {
	const variant = await requireVariant(userId, id);
	await prisma.bathroomVariant.delete({ where: { id: variant.id } });
	return { ok: true as const };
}

/** Drag-to-reorder a variant within its product. */
export async function reorderBathroomVariant(
	userId: string,
	id: string,
	order: string,
) {
	const variant = await requireVariant(userId, id);
	await prisma.bathroomVariant.update({
		where: { id: variant.id },
		data: { order },
	});
	return { ok: true as const };
}

/**
 * Acquire a batch of a variant. Creates the BathroomBatch AND inserts `quantity`
 * BathroomUnit rows (state = InStock), all in one transaction so the on-hand count
 * never reflects a half-applied acquisition.
 */
export async function addBathroomBatch(
	userId: string,
	variantId: string,
	input: AddBathroomBatchInput,
) {
	const variant = await requireVariant(userId, variantId);
	return prisma.$transaction(async (tx) => {
		const batch = await tx.bathroomBatch.create({
			data: {
				quantity: input.quantity,
				acquiredAt: input.acquiredAt ?? new Date(),
				variant: { connect: { id: variant.id } },
				user: { connect: { id: userId } },
			},
		});
		await tx.bathroomUnit.createMany({
			data: Array.from({ length: input.quantity }, () => ({
				state: 'InStock' as const,
				variantId: variant.id,
				batchId: batch.id,
				userId,
			})),
		});
		return batch;
	});
}

export async function deleteBathroomBatch(userId: string, id: string) {
	const batch = await requireBatch(userId, id);
	await prisma.bathroomBatch.delete({ where: { id: batch.id } });
	return { ok: true as const };
}

/**
 * Unit lifecycle. Each transition is guarded by the unit's current state and runs
 * in a transaction (load-then-update) so two concurrent actions can't double-apply.
 * Transitions are valid regardless of the product's nature — the UI gates which
 * actions are offered (consume/retire for consumables+appliances, dirty/washed for
 * launderables).
 */
async function transition(
	userId: string,
	id: string,
	from: string,
	data: Record<string, unknown>,
) {
	return prisma.$transaction(async (tx) => {
		const unit = await tx.bathroomUnit.findUnique({ where: { id } });
		if (unit?.userId !== userId) throw new ApiError(404, 'Unit not found');
		if (unit.state !== from) throw new ApiError(409, `Unit is not ${from}`);
		return tx.bathroomUnit.update({ where: { id: unit.id }, data });
	});
}

/** InStock → InUse (records when, and optionally onto which trip). */
export function checkOutBathroomUnit(
	userId: string,
	id: string,
	tripId?: string | null,
) {
	return transition(userId, id, 'InStock', {
		state: 'InUse',
		checkedOutAt: new Date(),
		tripId: tripId ?? null,
	});
}

/** InUse → InStock (returned without ending the unit). */
export function checkInBathroomUnit(userId: string, id: string) {
	return transition(userId, id, 'InUse', {
		state: 'InStock',
		checkedOutAt: null,
		tripId: null,
	});
}

/** InUse → Gone (consumed / retired). */
export function endBathroomUnit(userId: string, id: string) {
	return transition(userId, id, 'InUse', {
		state: 'Gone',
		endedAt: new Date(),
	});
}

/** InUse → Dirty (launderable sent to the wash). */
export function markBathroomUnitDirty(userId: string, id: string) {
	return transition(userId, id, 'InUse', { state: 'Dirty' });
}

/** Dirty → InStock (launderable washed and back on the shelf). */
export function markBathroomUnitWashed(userId: string, id: string) {
	return transition(userId, id, 'Dirty', { state: 'InStock' });
}

/**
 * "Use one" for consumables: retire a single on-hand unit of the variant. Picks one
 * non-Gone unit (preferring one already InUse, else InStock) and marks it Gone, all
 * in a transaction so two concurrent "use one" taps can't retire the same unit twice.
 * 409s when the variant has nothing left on hand.
 */
export async function useOneBathroomVariant(userId: string, variantId: string) {
	const variant = await requireVariant(userId, variantId);
	return prisma.$transaction(async (tx) => {
		// Prefer consuming something already opened (InUse) before cracking a fresh
		// one (InStock); fall back to any remaining non-Gone unit as a last resort.
		const unit =
			(await tx.bathroomUnit.findFirst({
				where: { userId, variantId: variant.id, state: 'InUse' },
				orderBy: { id: 'asc' },
			})) ??
			(await tx.bathroomUnit.findFirst({
				where: { userId, variantId: variant.id, state: 'InStock' },
				orderBy: { id: 'asc' },
			})) ??
			(await tx.bathroomUnit.findFirst({
				where: { userId, variantId: variant.id, state: { not: 'Gone' } },
				orderBy: { id: 'asc' },
			}));
		if (!unit) throw new ApiError(409, 'Nothing on hand to use');
		return tx.bathroomUnit.update({
			where: { id: unit.id },
			data: { state: 'Gone', endedAt: new Date() },
		});
	});
}

export async function createBathroomType(
	userId: string,
	input: CreateBathroomTypeInput,
) {
	return prisma.bathroomType.create({
		data: { name: input.name, userId },
	});
}

export async function editBathroomType(
	userId: string,
	name: string,
	input: EditBathroomTypeInput,
) {
	const renaming = input.name !== name;
	const [, type] = await prisma.$transaction([
		// Keep the denormalized `typeName` on the user's products in sync.
		prisma.bathroomProduct.updateMany({
			where: { userId, typeName: name },
			data: renaming ? { typeName: input.name } : {},
		}),
		prisma.bathroomType.update({
			where: { userId_name: { userId, name } },
			data: { name: input.name },
		}),
	]);
	return type;
}

/** Delete a user's bathroom type; refuses if any product still uses it. */
export async function deleteBathroomType(userId: string, name: string) {
	const inUse = await prisma.bathroomProduct.count({
		where: { userId, typeName: name },
	});
	if (inUse > 0)
		throw new ApiError(409, `"${name}" is used by ${inUse} product(s)`);
	await prisma.bathroomType.delete({
		where: { userId_name: { userId, name } },
	});
	return { ok: true as const };
}
