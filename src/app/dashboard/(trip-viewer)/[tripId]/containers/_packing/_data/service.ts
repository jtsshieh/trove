import {
	requireClothingProvision,
	requireEssentialProvision,
} from '@/lib/api/ownership';
import { prisma } from '@/lib/db.server';

import type {
	MarkClothingProvisionPackedInput,
	MarkEssentialProvisionPackedInput,
} from './schemas';

/**
 * Server-side write logic for the container packing board. Ownership is enforced
 * here via the shared API-layer guards (each mutating function takes the caller's
 * `userId` and 404s on a row it doesn't own), replacing the old next-safe-action
 * ownership middleware. No revalidatePath — the client invalidates the board query.
 */

/** Toggle a clothing provision's packed flag. */
export async function markClothingProvisionPacked(
	userId: string,
	provisionId: string,
	{ packed }: MarkClothingProvisionPackedInput,
) {
	await requireClothingProvision(userId, provisionId);

	await prisma.clothingProvision.update({
		where: { id: provisionId },
		data: { packed },
	});

	return {
		type: 'success' as const,
		message: 'Clothing provision successfully updated',
	};
}

/** Toggle an essential provision's packed flag. */
export async function markEssentialProvisionPacked(
	userId: string,
	provisionId: string,
	{ packed }: MarkEssentialProvisionPackedInput,
) {
	await requireEssentialProvision(userId, provisionId);

	await prisma.essentialProvision.update({
		where: { id: provisionId },
		data: { packed },
	});

	return {
		type: 'success' as const,
		message: 'Essential provision successfully updated',
	};
}
