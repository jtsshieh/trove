import {
	requireClothingProvision,
	requireContainer,
	requireContainerProvision,
	requireEssentialProvision,
	requireTrip,
} from '@/lib/api/ownership';
import { prisma } from '@/lib/db.server';
import { rankAfter } from '@/lib/dnd/lexorank';

import type {
	CreateContainerProvisionInput,
	MoveProvisionToContainerInput,
} from './schemas';

/**
 * Server-side write logic for the containers provisioning board. Ownership is
 * enforced here via the shared API-layer guards (each mutating function takes the
 * caller's `userId` and 404s on a row it doesn't own), replacing the old
 * next-safe-action ownership middleware. No revalidatePath — the client
 * invalidates the board query.
 */

/**
 * Add `count` of the user's container (catalog) to the trip → one ContainerProvision
 * per unit, each its own card. Capped at how many of that container the user still has
 * free (owned quantity minus the count already on this trip). Each new row gets the
 * next tripOrder rank so the cards keep a stable, reorderable order.
 */
export async function createContainerProvision(
	userId: string,
	tripId: string,
	{ containerId, count = 1 }: CreateContainerProvisionInput,
) {
	await requireTrip(userId, tripId);
	const container = await requireContainer(userId, containerId);

	const onTrip = await prisma.containerProvision.count({
		where: { tripId, containerId },
	});
	const free = Math.max(0, container.quantity - onTrip);
	if (free === 0) {
		return {
			type: 'warning' as const,
			message: 'Already at the owned quantity for this container',
		};
	}
	const toAdd = Math.min(count, free);

	const last = await prisma.containerProvision.findFirst({
		where: { tripId },
		orderBy: { tripOrder: 'desc' },
		select: { tripOrder: true },
	});
	let rank: string | null = last?.tripOrder ?? null;
	const data = Array.from({ length: toAdd }, () => {
		rank = rankAfter(rank);
		return { tripId, containerId, tripOrder: rank };
	});
	await prisma.containerProvision.createMany({ data });

	return {
		type: 'success' as const,
		message:
			toAdd === 1 ? 'Container added to trip' : `Added ${toAdd} containers`,
	};
}

/** Reorder a container provision's card within the trip's containers board. */
export async function changeContainerProvisionTripOrder(
	userId: string,
	containerProvisionId: string,
	tripOrder: string,
) {
	await requireContainerProvision(userId, containerProvisionId);

	await prisma.containerProvision.update({
		where: { id: containerProvisionId },
		data: { tripOrder },
	});

	return { type: 'success' as const, message: 'Reordered' };
}

/**
 * Mark a clothing piece "containerless" — packed directly into a suitcase rather than
 * into a container. Clears any container assignment; the piece then shows in the
 * luggage board's pool until dragged into a specific suitcase.
 */
export async function setClothingProvisionContainerless(
	userId: string,
	clothingProvisionId: string,
) {
	await requireClothingProvision(userId, clothingProvisionId);

	await prisma.clothingProvision.update({
		where: { id: clothingProvisionId },
		data: {
			containerless: true,
			containerProvisionId: null,
			containerOrder: null,
		},
	});

	return { type: 'success' as const, message: 'Marked direct-to-luggage' };
}

/** Mark an essential "containerless" — packed directly into a suitcase. */
export async function setEssentialProvisionContainerless(
	userId: string,
	essentialProvisionId: string,
) {
	await requireEssentialProvision(userId, essentialProvisionId);

	await prisma.essentialProvision.update({
		where: { id: essentialProvisionId },
		data: {
			containerless: true,
			containerProvisionId: null,
			containerOrder: null,
		},
	});

	return { type: 'success' as const, message: 'Marked direct-to-luggage' };
}

/** Take a container off the trip; its items return to the Unassigned pool (SetNull). */
export async function deleteContainerProvision(
	userId: string,
	containerProvisionId: string,
) {
	await requireContainerProvision(userId, containerProvisionId);

	await prisma.containerProvision.delete({
		where: { id: containerProvisionId },
	});

	return { type: 'success' as const, message: 'Container removed' };
}

/** Drop a clothing piece into a container at a specific position (drag path). */
export async function moveClothingProvisionToContainer(
	userId: string,
	clothingProvisionId: string,
	{ containerProvisionId, containerOrder }: MoveProvisionToContainerInput,
) {
	await requireClothingProvision(userId, clothingProvisionId);
	await requireContainerProvision(userId, containerProvisionId);

	await prisma.clothingProvision.update({
		where: { id: clothingProvisionId },
		data: {
			containerOrder,
			containerProvision: { connect: { id: containerProvisionId } },
		},
	});

	return { type: 'success' as const, message: 'Moved' };
}

/** Reorder a clothing piece within its current container. */
export async function changeClothingProvisionContainerOrder(
	userId: string,
	clothingProvisionId: string,
	containerOrder: string,
) {
	await requireClothingProvision(userId, clothingProvisionId);

	await prisma.clothingProvision.update({
		where: { id: clothingProvisionId },
		data: { containerOrder },
	});

	return { type: 'success' as const, message: 'Reordered' };
}

/**
 * Pull a clothing piece back into the Unassigned pool — from a container OR from the
 * "containerless" (direct-to-luggage) state. Fully resets every packing field so the
 * piece is truly unassigned again.
 */
export async function deleteClothingProvisionFromContainer(
	userId: string,
	clothingProvisionId: string,
) {
	await requireClothingProvision(userId, clothingProvisionId);

	await prisma.clothingProvision.update({
		where: { id: clothingProvisionId },
		data: {
			containerOrder: null,
			containerProvisionId: null,
			containerless: false,
			luggageProvisionId: null,
			luggageOrder: null,
		},
	});

	return { type: 'success' as const, message: 'Unpacked' };
}

/** Drop an essential into a container at a specific position (drag path). */
export async function moveEssentialProvisionToContainer(
	userId: string,
	essentialProvisionId: string,
	{ containerProvisionId, containerOrder }: MoveProvisionToContainerInput,
) {
	await requireEssentialProvision(userId, essentialProvisionId);
	await requireContainerProvision(userId, containerProvisionId);

	await prisma.essentialProvision.update({
		where: { id: essentialProvisionId },
		data: {
			containerOrder,
			containerProvision: { connect: { id: containerProvisionId } },
		},
	});

	return { type: 'success' as const, message: 'Moved' };
}

/** Reorder an essential within its current container. */
export async function changeEssentialProvisionContainerOrder(
	userId: string,
	essentialProvisionId: string,
	containerOrder: string,
) {
	await requireEssentialProvision(userId, essentialProvisionId);

	await prisma.essentialProvision.update({
		where: { id: essentialProvisionId },
		data: { containerOrder },
	});

	return { type: 'success' as const, message: 'Reordered' };
}

/**
 * Pull an essential back into the Unassigned pool — from a container OR from the
 * "containerless" (direct-to-luggage) state. Fully resets every packing field.
 */
export async function deleteEssentialProvisionFromContainer(
	userId: string,
	essentialProvisionId: string,
) {
	await requireEssentialProvision(userId, essentialProvisionId);

	await prisma.essentialProvision.update({
		where: { id: essentialProvisionId },
		data: {
			containerOrder: null,
			containerProvisionId: null,
			containerless: false,
			luggageProvisionId: null,
			luggageOrder: null,
		},
	});

	return { type: 'success' as const, message: 'Unpacked' };
}
