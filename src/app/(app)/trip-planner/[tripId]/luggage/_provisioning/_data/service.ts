import {
	requireContainer,
	requireContainerProvision,
	requireLuggage,
	requireLuggageProvision,
	requireTrip,
} from '@/lib/api/ownership';
import { prisma } from '@/lib/db.server';

import type {
	CreateLuggageProvisionInput,
	MoveContainerProvisionToLuggageInput,
} from './schemas';

/**
 * Server-side write logic for the trip suitcases (luggage) provisioning board.
 * Ownership is enforced here via the shared API-layer guards (each mutating
 * function takes the caller's `userId` and 404s on a row it doesn't own),
 * replacing the old next-safe-action ownership middleware. No revalidatePath —
 * the client invalidates the board query.
 */

/** Bring one of the user's suitcases onto this trip. */
export async function createLuggageProvision(
	userId: string,
	tripId: string,
	{ luggageId }: CreateLuggageProvisionInput,
) {
	await requireTrip(userId, tripId);
	const luggage = await requireLuggage(userId, luggageId);

	await prisma.luggageProvision.create({
		data: {
			trip: { connect: { id: tripId } },
			luggage: { connect: { id: luggage.id } },
		},
	});

	return { type: 'success' as const, message: 'Suitcase added to trip' };
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
	const containerProvision = await requireContainerProvision(userId, provisionId);
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
