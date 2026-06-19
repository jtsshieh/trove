import { cache } from 'react';

import { prisma } from '../../../../../lib/db.server';
import { getCurrentUserSafe } from '../../account/_data/fetchers';

export const getAllEssentials = cache(async () => {
	const user = await getCurrentUserSafe();
	return prisma.essential.findMany({
		orderBy: { name: 'asc' },
		where: {
			userId: user.id,
		},
	});
});
