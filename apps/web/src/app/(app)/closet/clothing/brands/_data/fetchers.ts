import { cache } from 'react';

import { getCurrentUserSafe } from '@/lib/auth';
import { prisma } from '@/lib/db.server';

export const getAllBrands = cache(async () => {
	const user = await getCurrentUserSafe();
	return prisma.brand.findMany({
		where: { userId: user.id },
		orderBy: { name: 'asc' },
	});
});
