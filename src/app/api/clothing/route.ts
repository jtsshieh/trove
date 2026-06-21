import { createClothingSchema } from '@/app/dashboard/(main)/wardrobe/_data/schemas';
import * as service from '@/app/dashboard/(main)/wardrobe/_data/service';
import { getAllClothes } from '@/app/dashboard/(main)/wardrobe/_data/fetchers';
import { authedRoute } from '@/lib/api/http';

export const GET = authedRoute({
	handler: () => getAllClothes(),
});

export const POST = authedRoute({
	body: createClothingSchema,
	handler: ({ user, body }) => service.createClothing(user.id, body),
});
