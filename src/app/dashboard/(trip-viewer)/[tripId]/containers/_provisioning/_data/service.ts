import {
	requireClothingProvision,
	requireContainer,
	requireContainerProvision,
	requireEssentialProvision,
	requireTrip,
} from '@/lib/api/ownership';
import { prisma } from '@/lib/db.server';

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

/** Add one of the user's containers (catalog) to the trip → a ContainerProvision. */
export async function createContainerProvision(
	userId: string,
	tripId: string,
	{ containerId }: CreateContainerProvisionInput,
) {
	await requireTrip(userId, tripId);
	await requireContainer(userId, containerId);

	await prisma.containerProvision.create({
		data: {
			trip: { connect: { id: tripId } },
			container: { connect: { id: containerId } },
		},
	});

	return { type: 'success' as const, message: 'Container added to trip' };
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

/** Pull a clothing piece out of its container, back into the Unassigned pool. */
export async function deleteClothingProvisionFromContainer(
	userId: string,
	clothingProvisionId: string,
) {
	await requireClothingProvision(userId, clothingProvisionId);

	await prisma.clothingProvision.update({
		where: { id: clothingProvisionId },
		data: { containerOrder: null, containerProvisionId: null },
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

/** Pull an essential out of its container, back into the Unassigned pool. */
export async function deleteEssentialProvisionFromContainer(
	userId: string,
	essentialProvisionId: string,
) {
	await requireEssentialProvision(userId, essentialProvisionId);

	await prisma.essentialProvision.update({
		where: { id: essentialProvisionId },
		data: { containerOrder: null, containerProvisionId: null },
	});

	return { type: 'success' as const, message: 'Unpacked' };
}
