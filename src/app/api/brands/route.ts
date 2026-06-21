import { getAllBrands } from '@/app/dashboard/(main)/wardrobe/brands/_data/fetchers';
import { createBrandSchema } from '@/app/dashboard/(main)/wardrobe/brands/_data/schemas';
import * as service from '@/app/dashboard/(main)/wardrobe/brands/_data/service';
import { authedRoute } from '@/lib/api/http';

export const GET = authedRoute({
	handler: () => getAllBrands(),
});

export const POST = authedRoute({
	body: createBrandSchema,
	handler: ({ body }) => service.createBrand(body),
});
