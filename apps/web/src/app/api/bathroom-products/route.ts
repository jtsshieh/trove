import { getAllBathroomProducts } from '@/app/(app)/bathroom/_data/fetchers';
import { createBathroomProductSchema } from '@/app/(app)/bathroom/_data/schemas';
import * as service from '@/app/(app)/bathroom/_data/service';
import { authedRoute } from '@/lib/api/http';

export const GET = authedRoute({
	handler: () => getAllBathroomProducts(),
});

export const POST = authedRoute({
	body: createBathroomProductSchema,
	handler: ({ user, body }) => service.createBathroomProduct(user.id, body),
});
