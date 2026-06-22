import { createClothingBatchSchema } from '@/app/(app)/closet/clothing/_data/schemas';
import * as service from '@/app/(app)/closet/clothing/_data/service';
import { authedRoute } from '@/lib/api/http';

export const POST = authedRoute({
	body: createClothingBatchSchema,
	handler: ({ user, body }) => service.createClothingBatch(user.id, body.items),
});
