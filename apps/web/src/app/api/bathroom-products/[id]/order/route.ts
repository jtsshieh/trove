import { z } from 'zod';

import { changeBathroomOrderSchema } from '@/app/(app)/bathroom/_data/schemas';
import * as service from '@/app/(app)/bathroom/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: changeBathroomOrderSchema,
	handler: ({ user, params, body }) =>
		service.reorderBathroomProduct(user.id, params.id, body.order),
});
