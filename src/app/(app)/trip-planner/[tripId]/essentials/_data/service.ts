import {
	requireEssentialProvision,
	requireTrip,
	requireTripEssentialGroup,
} from '@/lib/api/ownership';
import { prisma } from '@/lib/db.server';
import { rankAfter } from '@/lib/dnd/lexorank';
import { EssentialCategory, ProvisionSection } from '@/generated/prisma/enums';

import { ApiError } from '@/lib/api/errors';

import type {
	CreateEssentialProvisionsInput,
	CreateTripEssentialGroupInput,
	ImportEssentialGroupInput,
	MoveEssentialProvisionInput,
	RenameTripEssentialGroupInput,
} from './schemas';

/**
 * Server-side write logic for the trip essentials board. Ownership is enforced here
 * via the shared API-layer guards (each mutating function takes the caller's
 * `userId` and 404s on a row it doesn't own), replacing the old next-safe-action
 * ownership middleware. No revalidatePath — the client invalidates the board query.
 */

/** How many provisions of each essential already exist on the trip. */
async function provisionCounts(tripId: string, essentialIds: string[]) {
	const existing = await prisma.essentialProvision.findMany({
		where: { tripId, essentialId: { in: essentialIds } },
		select: { essentialId: true },
	});
	const counts = new Map<string, number>();
	for (const p of existing) {
		counts.set(p.essentialId, (counts.get(p.essentialId) ?? 0) + 1);
	}
	return counts;
}

/** Batch-add essentials to a day or to the Universal section, optionally in a sub-group. */
export async function createEssentialProvisions(
	userId: string,
	tripId: string,
	{
		essentialIds,
		section,
		day,
		tripEssentialGroupId,
	}: CreateEssentialProvisionsInput,
) {
	await requireTrip(userId, tripId);

	if (section === ProvisionSection.Day && !day) {
		throw new ApiError(400, 'A day is required for the Day section');
	}
	const placementDay = section === ProvisionSection.Day ? day! : null;

	const owned = await prisma.essential.findMany({
		where: { id: { in: essentialIds }, userId },
		select: { id: true, quantity: true },
	});
	const quantityById = new Map(owned.map((e) => [e.id, e.quantity]));
	const counts = await provisionCounts(tripId, [...quantityById.keys()]);

	// Never provision more units of an essential than the user owns.
	const toCreate = essentialIds.filter((id) => {
		const max = quantityById.get(id);
		if (max === undefined) return false;
		return (counts.get(id) ?? 0) < max;
	});
	if (toCreate.length === 0) {
		return {
			type: 'warning' as const,
			message: 'Already at the owned quantity',
		};
	}

	const last = await prisma.essentialProvision.findFirst({
		where: { tripId },
		orderBy: { dayOrder: 'desc' },
		select: { dayOrder: true },
	});

	let rank: string | null = last?.dayOrder ?? null;
	const data = toCreate.map((essentialId) => {
		rank = rankAfter(rank);
		return {
			tripId,
			essentialId,
			section,
			day: placementDay,
			dayOrder: rank,
			tripEssentialGroupId: tripEssentialGroupId ?? null,
		};
	});
	await prisma.essentialProvision.createMany({ data });

	return {
		type: 'success' as const,
		message: `Added ${data.length} item${data.length > 1 ? 's' : ''}`,
	};
}

/** Reorder a provision within its current bucket (category free-list or sub-group). */
export async function changeEssentialProvisionDayOrder(
	userId: string,
	provisionId: string,
	newOrder: string,
) {
	await requireEssentialProvision(userId, provisionId);

	await prisma.essentialProvision.update({
		where: { id: provisionId },
		data: { dayOrder: newOrder },
	});

	return { type: 'success' as const, message: 'Reordered' };
}

/** Move a provision into/out of a sub-group (within its category) + set its rank. */
export async function moveEssentialProvision(
	userId: string,
	provisionId: string,
	{ tripEssentialGroupId, dayOrder }: MoveEssentialProvisionInput,
) {
	await requireEssentialProvision(userId, provisionId);

	await prisma.essentialProvision.update({
		where: { id: provisionId },
		data: { tripEssentialGroupId: tripEssentialGroupId ?? null, dayOrder },
	});

	return { type: 'success' as const, message: 'Moved' };
}

/** Remove a single provision (one unit) from the trip. */
export async function deleteEssentialProvision(
	userId: string,
	provisionId: string,
) {
	await requireEssentialProvision(userId, provisionId);

	await prisma.essentialProvision.delete({ where: { id: provisionId } });

	return { type: 'success' as const, message: 'Removed' };
}

/** Create an empty single-category sub-group on the trip. */
export async function createTripEssentialGroup(
	userId: string,
	tripId: string,
	{ name, category }: CreateTripEssentialGroupInput,
) {
	await requireTrip(userId, tripId);

	const last = await prisma.tripEssentialGroup.findFirst({
		where: { tripId },
		orderBy: { order: 'desc' },
		select: { order: true },
	});
	await prisma.tripEssentialGroup.create({
		data: { name, category, order: rankAfter(last?.order), tripId },
	});

	return { type: 'success' as const, message: 'Group created' };
}

export async function renameTripEssentialGroup(
	userId: string,
	tripEssentialGroupId: string,
	{ name }: RenameTripEssentialGroupInput,
) {
	const tripEssentialGroup = await requireTripEssentialGroup(
		userId,
		tripEssentialGroupId,
	);

	await prisma.tripEssentialGroup.update({
		where: { id: tripEssentialGroup.id },
		data: { name },
	});

	return { type: 'success' as const, message: 'Renamed' };
}

/** Delete a sub-group. Its provisions ungroup (onDelete: SetNull) and stay on the trip. */
export async function deleteTripEssentialGroup(
	userId: string,
	tripEssentialGroupId: string,
) {
	const tripEssentialGroup = await requireTripEssentialGroup(
		userId,
		tripEssentialGroupId,
	);

	// Provisions point at this group with onDelete: SetNull, so deleting the
	// group ungroups its items (they stay on the trip) rather than removing them.
	await prisma.tripEssentialGroup.delete({
		where: { id: tripEssentialGroup.id },
	});

	return { type: 'success' as const, message: 'Group removed' };
}

/** Import a premade essential group, splitting it into one sub-group per category. */
export async function importEssentialGroup(
	userId: string,
	tripId: string,
	{ groupId }: ImportEssentialGroupInput,
) {
	await requireTrip(userId, tripId);

	const group = await prisma.essentialGroup.findFirst({
		where: { id: groupId, userId },
		include: { items: { include: { essential: true } } },
	});
	if (!group) throw new ApiError(404, 'Essential group not found');

	// A premade group can span categories; each on-trip sub-group is
	// single-category, so split the import into one sub-group per category.
	const byCategory = new Map<
		EssentialCategory,
		{ id: string; quantity: number }[]
	>();
	for (const item of group.items) {
		const list = byCategory.get(item.essential.category) ?? [];
		list.push({ id: item.essentialId, quantity: item.essential.quantity });
		byCategory.set(item.essential.category, list);
	}

	const counts = await provisionCounts(
		tripId,
		group.items.map((i) => i.essentialId),
	);
	let groupRank =
		(
			await prisma.tripEssentialGroup.findFirst({
				where: { tripId },
				orderBy: { order: 'desc' },
				select: { order: true },
			})
		)?.order ?? null;
	let provisionRank =
		(
			await prisma.essentialProvision.findFirst({
				where: { tripId },
				orderBy: { dayOrder: 'desc' },
				select: { dayOrder: true },
			})
		)?.dayOrder ?? null;

	let added = 0;
	for (const [category, essentials] of byCategory) {
		const addable = essentials.filter(
			(e) => (counts.get(e.id) ?? 0) < e.quantity,
		);
		if (addable.length === 0) continue;

		groupRank = rankAfter(groupRank);
		const tripGroup = await prisma.tripEssentialGroup.create({
			data: {
				name: group.name,
				category,
				order: groupRank,
				tripId,
				sourceGroupId: group.id,
			},
		});
		const data = addable.map((e) => {
			provisionRank = rankAfter(provisionRank);
			counts.set(e.id, (counts.get(e.id) ?? 0) + 1);
			return {
				tripId,
				essentialId: e.id,
				section: ProvisionSection.Universal,
				day: null,
				dayOrder: provisionRank,
				tripEssentialGroupId: tripGroup.id,
			};
		});
		await prisma.essentialProvision.createMany({ data });
		added += data.length;
	}

	return added > 0
		? { type: 'success' as const, message: `Imported ${group.name}` }
		: {
				type: 'warning' as const,
				message: 'Everything in that group is already at its owned quantity',
			};
}
