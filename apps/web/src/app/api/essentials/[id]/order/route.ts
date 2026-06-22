import { z } from 'zod';

import { changeEssentialOrderSchema } from '@/app/(app)/closet/essentials/_data/schemas';
import * as service from '@/app/(app)/closet/essentials/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: changeEssentialOrderSchema,
	handler: ({ user, params, body }) =>
		service.reorderEssential(user.id, params.id, body.order),
});
