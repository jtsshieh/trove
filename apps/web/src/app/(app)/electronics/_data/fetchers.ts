import { cache } from 'react';

import { getCurrentUserSafe } from '@/lib/auth';
import { prisma } from '@/lib/db.server';

/**
 * Loads every electronic for the current user, grouped/sorted by the manual
 * lexorank order. Includes the denormalized brand plus both sides of the
 * accessory associations (asDevice → the accessory it points at, asAccessory →
 * the device that points at it) so a card can show every linked item.
 */
export const getAllElectronics = cache(async () => {
	const user = await getCurrentUserSafe();
	return prisma.electronic.findMany({
		// Honor the user's manual order (lexorank), set via drag-to-reorder.
		orderBy: { order: 'asc' },
		where: { userId: user.id },
		include: {
			brand: true,
			asDevice: { include: { accessory: true } },
			asAccessory: { include: { device: true } },
		},
	});
});
