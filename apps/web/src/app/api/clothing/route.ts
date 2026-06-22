import { createClothingSchema } from '@/app/(app)/closet/clothing/_data/schemas';
import * as service from '@/app/(app)/closet/clothing/_data/service';
import { getAllClothes } from '@/app/(app)/closet/clothing/_data/fetchers';
import { authedRoute } from '@/lib/api/http';

export const GET = authedRoute({
	handler: () => getAllClothes(),
});

export const POST = authedRoute({
	body: createClothingSchema,
	handler: ({ user, body }) => service.createClothing(user.id, body),
});
