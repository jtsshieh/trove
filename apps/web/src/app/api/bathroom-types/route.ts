import { getAllBathroomTypes } from '@/app/(app)/bathroom/_data/fetchers';
import { createBathroomTypeSchema } from '@/app/(app)/bathroom/_data/schemas';
import * as service from '@/app/(app)/bathroom/_data/service';
import { authedRoute } from '@/lib/api/http';

export const GET = authedRoute({
	handler: () => getAllBathroomTypes(),
});

export const POST = authedRoute({
	body: createBathroomTypeSchema,
	handler: ({ user, body }) => service.createBathroomType(user.id, body),
});
