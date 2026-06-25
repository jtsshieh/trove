import { z } from 'zod';

import { editBathroomVariantSchema } from '@/app/(app)/bathroom/_data/schemas';
import * as service from '@/app/(app)/bathroom/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: editBathroomVariantSchema,
	handler: ({ user, params, body }) =>
		service.editBathroomVariant(user.id, params.id, body),
});

export const DELETE = authedRoute({
	params: paramsSchema,
	handler: ({ user, params }) =>
		service.deleteBathroomVariant(user.id, params.id),
});
