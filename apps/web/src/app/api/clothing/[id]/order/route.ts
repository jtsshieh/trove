import { z } from 'zod';

import { changeClothingOrderSchema } from '@/app/(app)/closet/clothing/_data/schemas';
import * as service from '@/app/(app)/closet/clothing/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: changeClothingOrderSchema,
	handler: ({ user, params, body }) =>
		service.reorderClothing(user.id, params.id, body.order),
});
