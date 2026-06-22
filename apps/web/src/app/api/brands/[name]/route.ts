import { z } from 'zod';

import { editBrandSchema } from '@/app/(app)/closet/clothing/brands/_data/schemas';
import * as service from '@/app/(app)/closet/clothing/brands/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ name: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: editBrandSchema,
	handler: ({ user, params, body }) =>
		service.editBrand(user.id, params.name, body),
});

export const DELETE = authedRoute({
	params: paramsSchema,
	handler: ({ user, params }) => service.deleteBrand(user.id, params.name),
});
