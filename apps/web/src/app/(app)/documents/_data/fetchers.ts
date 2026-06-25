import { cache } from 'react';

import { getCurrentUserSafe } from '@/lib/auth';
import { prisma } from '@/lib/db.server';

export const getAllDocuments = cache(async () => {
	const user = await getCurrentUserSafe();
	return prisma.document.findMany({
		// Honor the user's manual order (lexorank), set via drag-to-reorder.
		orderBy: { order: 'asc' },
		where: {
			userId: user.id,
		},
	});
});
