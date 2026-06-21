import { z } from 'zod';

import { editBrandSchema } from '@/app/dashboard/(main)/wardrobe/brands/_data/schemas';
import * as service from '@/app/dashboard/(main)/wardrobe/brands/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ name: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: editBrandSchema,
	handler: ({ params, body }) => service.editBrand(params.name, body),
});

export const DELETE = authedRoute({
	params: paramsSchema,
	handler: ({ params }) => service.deleteBrand(params.name),
});
