import { scanElectronic } from '@/lib/ai.server';
import { ApiError } from '@/lib/api/errors';
import { prisma } from '@/lib/db.server';
import { rankAfter } from '@/lib/dnd/lexorank';
import { getObject } from '@/lib/storage.server';
import { BrandDomain } from '@/generated/prisma/enums';

import type {
	CreateElectronicInput,
	EditElectronicInput,
	ElectronicScanSuggestion,
} from './schemas';

/**
 * Server-side write logic for electronics. Ownership is enforced here (every
 * mutating function takes the caller's `userId` and 404s on a row it doesn't own),
 * mirroring the essentials/clothing services.
 */

/**
 * Connects an electronic to its (per-user) brand, creating it if the user doesn't
 * own it yet, and ensures the brand is tagged with `domain=Electronics` so it shows
 * up in this app's brand picker. Matched by the `userId_name` composite so two users
 * can own the same brand. The shared Brand table spans domains, so a brand the user
 * already created for another app (Closet/Bathroom) just gains the Electronics tag.
 */
async function brandConnectOrCreate(userId: string, brand: string) {
	const existing = await prisma.brand.findUnique({
		where: { userId_name: { userId, name: brand } },
		select: { domains: true },
	});
	if (existing && !existing.domains.includes(BrandDomain.Electronics)) {
		await prisma.brand.update({
			where: { userId_name: { userId, name: brand } },
			data: { domains: { push: BrandDomain.Electronics } },
		});
	}
	return {
		connectOrCreate: {
			where: { userId_name: { userId, name: brand } },
			create: {
				name: brand,
				domains: [BrandDomain.Electronics],
				user: { connect: { id: userId } },
			},
		},
	};
}

/** Loads an electronic, 404ing if it doesn't belong to `userId`. */
async function requireElectronic(userId: string, id: string) {
	const electronic = await prisma.electronic.findUnique({ where: { id } });
	if (electronic?.userId !== userId)
		throw new ApiError(404, 'Electronic not found');
	return electronic;
}

/** Next lexorank after the user's last electronic (appends to the catalog order). */
async function nextElectronicRank(userId: string) {
	const last = await prisma.electronic.findFirst({
		where: { userId },
		orderBy: { order: 'desc' },
		select: { order: true },
	});
	return rankAfter(last?.order || null);
}

export async function createElectronic(
	userId: string,
	input: CreateElectronicInput,
) {
	return prisma.electronic.create({
		data: {
			name: input.name,
			kind: input.kind,
			model: input.model,
			serialNumber: input.serialNumber,
			acquiredAt: input.acquiredAt,
			quantity: input.quantity ?? 1,
			notes: input.notes,
			imageKey: input.imageKey,
			order: await nextElectronicRank(userId),
			user: { connect: { id: userId } },
			// Denormalized display string + the id relation (kept in sync), brand optional.
			...(input.brand
				? {
						brandName: input.brand,
						brand: await brandConnectOrCreate(userId, input.brand),
					}
				: {}),
		},
	});
}

export async function editElectronic(
	userId: string,
	id: string,
	input: EditElectronicInput,
) {
	const electronic = await requireElectronic(userId, id);

	const payload = {
		name: input.name,
		kind: input.kind,
		model: input.model,
		serialNumber: input.serialNumber,
		acquiredAt: input.acquiredAt,
		quantity: input.quantity,
		notes: input.notes,
		imageKey: input.imageKey,
	};
	if (input.brand !== undefined) {
		if (input.brand) {
			Object.assign(payload, {
				brandName: input.brand,
				brand: await brandConnectOrCreate(userId, input.brand),
			});
		} else {
			// Cleared brand: drop both the display string and the id relation.
			Object.assign(payload, { brandName: null, brand: { disconnect: true } });
		}
	}

	return prisma.electronic.update({
		where: { id: electronic.id },
		data: payload,
	});
}

export async function deleteElectronic(userId: string, id: string) {
	const electronic = await requireElectronic(userId, id);
	await prisma.electronic.delete({ where: { id: electronic.id } });
	return { ok: true as const };
}

/** Drag-to-reorder: persist a single electronic's new lexorank in the catalog order. */
export async function reorderElectronic(
	userId: string,
	id: string,
	order: string,
) {
	const electronic = await requireElectronic(userId, id);
	await prisma.electronic.update({
		where: { id: electronic.id },
		data: { order },
	});
	return { ok: true as const };
}

/**
 * Link an accessory to a device (self many-to-many via ElectronicLink). Both ends
 * must belong to the caller; the pair is unique, so a duplicate link is a no-op 409.
 */
export async function linkAccessory(
	userId: string,
	deviceId: string,
	accessoryId: string,
) {
	if (deviceId === accessoryId)
		throw new ApiError(400, 'An item cannot be linked to itself');
	// Both ends owned (404s on a non-owned id).
	await requireElectronic(userId, deviceId);
	await requireElectronic(userId, accessoryId);

	const existing = await prisma.electronicLink.findUnique({
		where: { deviceId_accessoryId: { deviceId, accessoryId } },
	});
	if (existing) throw new ApiError(409, 'These items are already linked');

	return prisma.electronicLink.create({ data: { deviceId, accessoryId } });
}

/**
 * LLM scan-to-fill for one electronic photo: load the user's Electronics-domain
 * brand names + the image bytes, ask the model to identify the item, and return a
 * suggestion the form prefills. Best-effort — yields `{ suggestion: null }` when the
 * model can't read the photo (the form just isn't pre-filled).
 */
export async function scanElectronicImage(
	userId: string,
	imageKey: string,
): Promise<{ suggestion: ElectronicScanSuggestion | null }> {
	const [brands, { body, contentType }] = await Promise.all([
		prisma.brand.findMany({
			where: { userId, domains: { has: BrandDomain.Electronics } },
			select: { name: true },
			orderBy: { name: 'asc' },
		}),
		getObject(imageKey),
	]);

	const ext = contentType.split('/')[1] ?? 'webp';
	const suggestion = await scanElectronic(
		body,
		ext,
		brands.map((b) => b.name),
	);
	return {
		suggestion: (suggestion as ElectronicScanSuggestion | null) ?? null,
	};
}

/** Remove an accessory association, 404ing if the link's device isn't owned. */
export async function unlinkAccessory(userId: string, id: string) {
	const link = await prisma.electronicLink.findUnique({
		where: { id },
		include: { device: { select: { userId: true } } },
	});
	if (link?.device.userId !== userId)
		throw new ApiError(404, 'Link not found');
	await prisma.electronicLink.delete({ where: { id } });
	return { ok: true as const };
}
