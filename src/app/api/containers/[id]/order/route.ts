import { z } from 'zod';

import { changeContainerOrderSchema } from '@/app/dashboard/(main)/packing-gear/containers/_data/schemas';
import * as service from '@/app/dashboard/(main)/packing-gear/containers/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: changeContainerOrderSchema,
	handler: ({ user, params, body }) =>
		service.reorderContainer(user.id, params.id, body.order),
});
