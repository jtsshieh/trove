import { z } from 'zod';

import { changeLuggageOrderSchema } from '@/app/(app)/closet/packing-gear/luggage/_data/schemas';
import * as service from '@/app/(app)/closet/packing-gear/luggage/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: changeLuggageOrderSchema,
	handler: ({ user, params, body }) =>
		service.reorderLuggage(user.id, params.id, body.order),
});
