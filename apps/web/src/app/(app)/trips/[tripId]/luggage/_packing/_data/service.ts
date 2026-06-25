import { requireContainerProvision } from '@/lib/api/ownership';
import { prisma } from '@/lib/db.server';

import type { MarkContainerPackedInput } from './schemas';

/**
 * Server-side write logic for the trip luggage packing board. Ownership is
 * enforced here via the shared API-layer guard (404s on a container provision the
 * caller doesn't own), replacing the old next-safe-action ownership middleware.
 * No revalidatePath — the client invalidates the board query.
 */

/** Toggle whether a container has been packed into its assigned suitcase. */
export async function markContainerPacked(
	userId: string,
	containerProvisionId: string,
	{ packed }: MarkContainerPackedInput,
) {
	await requireContainerProvision(userId, containerProvisionId);

	await prisma.containerProvision.update({
		where: { id: containerProvisionId },
		data: { packed },
	});

	return {
		type: 'success' as const,
		message: 'Container provision successfully updated',
	};
}
