import {
	requireEssentialProvision,
	requireTrip,
	requireTripEssentialGroup,
} from '@/lib/api/ownership';
import { prisma } from '@/lib/db.server';
import { rankAfter } from '@/lib/dnd/lexorank';
import { ProvisionSection } from '@/generated/prisma/enums';

import { ApiError } from '@/lib/api/errors';

import { essentialItemFk, essentialItemInclude } from '../../_data/essential-item';
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

/** Batch-add polymorphic items to a day or to the Universal section, optionally in a sub-group. */
export async function createEssentialProvisions(
	userId: string,
	tripId: string,
	{ items, section, day, tripEssentialGroupId }: CreateEssentialProvisionsInput,
) {
	await requireTrip(userId, tripId);

	if (section === ProvisionSection.Day && !day) {
		throw new ApiError(400, 'A day is required for the Day section');
	}
	const placementDay = section === ProvisionSection.Day ? day! : null;

	const last = await prisma.essentialProvision.findFirst({
		where: { tripId },
		orderBy: { dayOrder: 'desc' },
		select: { dayOrder: true },
	});

	let rank: string | null = last?.dayOrder ?? null;
	const data = items.map(({ kind, itemId }) => {
		rank = rankAfter(rank);
		return {
			tripId,
			...essentialItemFk(kind, itemId),
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

/** Reorder a provision within its current bucket (app free-list or sub-group). */
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

/** Move a provision into/out of a sub-group (within its app) + set its rank. */
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

/** Create an empty sub-group on the trip. */
export async function createTripEssentialGroup(
	userId: string,
	tripId: string,
	{ name }: CreateTripEssentialGroupInput,
) {
	await requireTrip(userId, tripId);

	const last = await prisma.tripEssentialGroup.findFirst({
		where: { tripId },
		orderBy: { order: 'desc' },
		select: { order: true },
	});
	await prisma.tripEssentialGroup.create({
		data: { name, order: rankAfter(last?.order), tripId },
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

/** Import a premade essential-group template as a single on-trip sub-group. */
export async function importEssentialGroup(
	userId: string,
	tripId: string,
	{ groupId }: ImportEssentialGroupInput,
) {
	await requireTrip(userId, tripId);

	const group = await prisma.essentialGroup.findFirst({
		where: { id: groupId, userId },
		include: { items: { include: essentialItemInclude } },
	});
	if (!group) throw new ApiError(404, 'Essential group not found');
	if (group.items.length === 0) {
		return {
			type: 'warning' as const,
			message: 'That group is empty',
		};
	}

	const groupRank =
		rankAfter(
			(
				await prisma.tripEssentialGroup.findFirst({
					where: { tripId },
					orderBy: { order: 'desc' },
					select: { order: true },
				})
			)?.order ?? null,
		);
	const tripGroup = await prisma.tripEssentialGroup.create({
		data: {
			name: group.name,
			order: groupRank,
			tripId,
			sourceGroupId: group.id,
		},
	});

	let provisionRank =
		(
			await prisma.essentialProvision.findFirst({
				where: { tripId },
				orderBy: { dayOrder: 'desc' },
				select: { dayOrder: true },
			})
		)?.dayOrder ?? null;

	const data = group.items.map((item) => {
		provisionRank = rankAfter(provisionRank);
		return {
			tripId,
			...essentialItemFk(item.kind, polymorphicItemId(item)),
			section: ProvisionSection.Universal,
			day: null,
			dayOrder: provisionRank,
			tripEssentialGroupId: tripGroup.id,
		};
	});
	await prisma.essentialProvision.createMany({ data });

	return { type: 'success' as const, message: `Imported ${group.name}` };
}

/** The polymorphic FK value carried by a group item, by its `kind`. */
function polymorphicItemId(item: {
	kind: 'Bathroom' | 'Electronic' | 'Document';
	bathroomVariantId: string | null;
	electronicId: string | null;
	documentId: string | null;
}): string {
	const id =
		item.kind === 'Bathroom'
			? item.bathroomVariantId
			: item.kind === 'Electronic'
				? item.electronicId
				: item.documentId;
	if (!id) throw new ApiError(500, 'Essential group item has no item');
	return id;
}
