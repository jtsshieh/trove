import { getAllBrands } from '@/app/(app)/closet/clothing/brands/_data/fetchers';
import { createBrandSchema } from '@/app/(app)/closet/clothing/brands/_data/schemas';
import * as service from '@/app/(app)/closet/clothing/brands/_data/service';
import { authedRoute } from '@/lib/api/http';

export const GET = authedRoute({
	handler: () => getAllBrands(),
});

export const POST = authedRoute({
	body: createBrandSchema,
	handler: ({ user, body }) => service.createBrand(user.id, body),
});
