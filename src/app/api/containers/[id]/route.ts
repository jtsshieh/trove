import { z } from 'zod';

import { editContainerSchema } from '@/app/dashboard/(main)/packing-gear/containers/_data/schemas';
import * as service from '@/app/dashboard/(main)/packing-gear/containers/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: editContainerSchema,
	handler: ({ user, params, body }) =>
		service.editContainer(user.id, params.id, body),
});

export const DELETE = authedRoute({
	params: paramsSchema,
	handler: ({ user, params }) => service.deleteContainer(user.id, params.id),
});
