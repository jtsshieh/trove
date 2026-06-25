import { z } from 'zod';

import { editBathroomTypeSchema } from '@/app/(app)/bathroom/_data/schemas';
import * as service from '@/app/(app)/bathroom/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ name: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: editBathroomTypeSchema,
	handler: ({ user, params, body }) =>
		service.editBathroomType(user.id, params.name, body),
});

export const DELETE = authedRoute({
	params: paramsSchema,
	handler: ({ user, params }) =>
		service.deleteBathroomType(user.id, params.name),
});
