import { cache } from 'react';

import { prisma } from '@/lib/db.server';

export const getAllBrands = cache(async () => {
	return prisma.brand.findMany({ orderBy: { name: 'asc' } });
});
