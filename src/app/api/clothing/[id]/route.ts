import { z } from 'zod';

import { editClothingSchema } from '@/app/dashboard/(main)/wardrobe/_data/schemas';
import * as service from '@/app/dashboard/(main)/wardrobe/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: editClothingSchema,
	handler: ({ user, params, body }) =>
		service.editClothing(user.id, params.id, body),
});

export const DELETE = authedRoute({
	params: paramsSchema,
	handler: ({ user, params }) => service.deleteClothing(user.id, params.id),
});
