import {
	requireClothingProvision,
	requireContainer,
	requireContainerProvision,
	requireEssentialProvision,
	requireLuggage,
	requireLuggageProvision,
	requireTrip,
} from '@/lib/api/ownership';
import { prisma } from '@/lib/db.server';
import { rankAfter } from '@/lib/dnd/lexorank';

import type {
	CreateLuggageProvisionInput,
	MoveContainerProvisionToLuggageInput,
	MoveProvisionToLuggageInput,
	SetLuggageProvisionKindInput,
} from './schemas';

/**
 * Server-side write logic for the trip suitcases (luggage) provisioning board.
 * Ownership is enforced here via the shared API-layer guards (each mutating
 * function takes the caller's `userId` and 404s on a row it doesn't own),
 * replacing the old next-safe-action ownership middleware. No revalidatePath —
 * the client invalidates the board query.
 */

/**
 * Add `count` of the user's suitcase (catalog) to the trip → one LuggageProvision
 * per unit, each its own card. Capped at how many of that suitcase the user still
 * has free (owned quantity minus the count already on this trip). Each new row gets
 * the next tripOrder rank so the cards keep a stable, reorderable order.
 */
export async function createLuggageProvision(
	userId: string,
	tripId: string,
	{ luggageId, count = 1 }: CreateLuggageProvisionInput,
) {
	await requireTrip(userId, tripId);
	const luggage = await requireLuggage(userId, luggageId);

	const onTrip = await prisma.luggageProvision.count({
		where: { tripId, luggageId },
	});
	const free = Math.max(0, luggage.quantity - onTrip);
	if (free === 0) {
		return {
			type: 'warning' as const,
			message: 'Already at the owned quantity for this suitcase',
		};
	}
	const toAdd = Math.min(count, free);

	const last = await prisma.luggageProvision.findFirst({
		where: { tripId },
		orderBy: { tripOrder: 'desc' },
		select: { tripOrder: true },
	});
	let rank: string | null = last?.tripOrder ?? null;
	const data = Array.from({ length: toAdd }, () => {
		rank = rankAfter(rank);
		return { tripId, luggageId, tripOrder: rank };
	});
	await prisma.luggageProvision.createMany({ data });

	return {
		type: 'success' as const,
		message:
			toAdd === 1 ? 'Suitcase added to trip' : `Added ${toAdd} suitcases`,
	};
}

/** Reorder a luggage provision's card within the trip's suitcases board. */
export async function changeLuggageProvisionTripOrder(
	userId: string,
	luggageProvisionId: string,
	tripOrder: string,
) {
	await requireLuggageProvision(userId, luggageProvisionId);

	await prisma.luggageProvision.update({
		where: { id: luggageProvisionId },
		data: { tripOrder },
	});

	return { type: 'success' as const, message: 'Reordered' };
}

/**
 * Set how a suitcase is checked in for the trip (CarryOn / Checked / Personal).
 * Drives TSA 3-1-1 liquids compliance — only CarryOn bags are evaluated.
 */
export async function setLuggageProvisionKind(
	userId: string,
	luggageProvisionId: string,
	{ kind }: SetLuggageProvisionKindInput,
) {
	await requireLuggageProvision(userId, luggageProvisionId);

	await prisma.luggageProvision.update({
		where: { id: luggageProvisionId },
		data: { kind },
	});

	return { type: 'success' as const, message: 'Updated' };
}

/** Take a suitcase off the trip. Its containers fall back to the pool (SetNull). */
export async function deleteLuggageProvision(
	userId: string,
	provisionId: string,
) {
	await requireLuggageProvision(userId, provisionId);

	await prisma.luggageProvision.delete({ where: { id: provisionId } });

	return { type: 'success' as const, message: 'Suitcase removed' };
}

/**
 * The universal container move on the board:
 * - `luggageProvisionId: null` removes the container from its suitcase (the
 *   `deleteContainerProvisionFromLuggage` case — both luggage fields null).
 * - a suitcase id + `luggageOrder` packs it into / reorders it within that
 *   suitcase (the `moveContainerProvisionToLuggage` /
 *   `changeContainerProvisionLuggageOrder` cases — one update sets both fields).
 */
export async function moveContainerProvisionToLuggage(
	userId: string,
	provisionId: string,
	{ luggageProvisionId, luggageOrder }: MoveContainerProvisionToLuggageInput,
) {
	const containerProvision = await requireContainerProvision(
		userId,
		provisionId,
	);
	await requireContainer(userId, containerProvision.containerId);

	if (luggageProvisionId === null) {
		await prisma.containerProvision.update({
			where: { id: provisionId },
			data: { luggageProvisionId: null, luggageOrder: null },
		});
		return { type: 'success' as const, message: 'Removed from suitcase' };
	}

	await requireLuggageProvision(userId, luggageProvisionId);

	await prisma.containerProvision.update({
		where: { id: provisionId },
		data: { luggageProvisionId, luggageOrder },
	});

	return { type: 'success' as const, message: 'Moved' };
}

/**
 * Move a "containerless" clothing piece on the luggage board:
 * - `luggageProvisionId: null` removes it from its suitcase, back to the pool. The
 *   piece STAYS containerless (so it remains in the luggage pool, not the closet).
 * - a suitcase id + `luggageOrder` packs it into / reorders it within that suitcase.
 * `containerless` is never touched here — only the containers board clears it.
 */
export async function moveClothingProvisionToLuggage(
	userId: string,
	provisionId: string,
	{ luggageProvisionId, luggageOrder }: MoveProvisionToLuggageInput,
) {
	await requireClothingProvision(userId, provisionId);

	if (luggageProvisionId === null) {
		await prisma.clothingProvision.update({
			where: { id: provisionId },
			data: { luggageProvisionId: null, luggageOrder: null },
		});
		return { type: 'success' as const, message: 'Removed from suitcase' };
	}

	await requireLuggageProvision(userId, luggageProvisionId);

	await prisma.clothingProvision.update({
		where: { id: provisionId },
		data: { luggageProvisionId, luggageOrder },
	});

	return { type: 'success' as const, message: 'Moved' };
}

/**
 * Move a "containerless" essential on the luggage board. Mirrors
 * `moveClothingProvisionToLuggage`; `containerless` is never touched here.
 */
export async function moveEssentialProvisionToLuggage(
	userId: string,
	provisionId: string,
	{ luggageProvisionId, luggageOrder }: MoveProvisionToLuggageInput,
) {
	await requireEssentialProvision(userId, provisionId);

	if (luggageProvisionId === null) {
		await prisma.essentialProvision.update({
			where: { id: provisionId },
			data: { luggageProvisionId: null, luggageOrder: null },
		});
		return { type: 'success' as const, message: 'Removed from suitcase' };
	}

	await requireLuggageProvision(userId, luggageProvisionId);

	await prisma.essentialProvision.update({
		where: { id: provisionId },
		data: { luggageProvisionId, luggageOrder },
	});

	return { type: 'success' as const, message: 'Moved' };
}
