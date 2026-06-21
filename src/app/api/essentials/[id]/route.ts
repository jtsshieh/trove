import { z } from 'zod';

import { editEssentialSchema } from '@/app/(app)/closet/essentials/_data/schemas';
import * as service from '@/app/(app)/closet/essentials/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: editEssentialSchema,
	handler: ({ user, params, body }) =>
		service.editEssential(user.id, params.id, body),
});

export const DELETE = authedRoute({
	params: paramsSchema,
	handler: ({ user, params }) => service.deleteEssential(user.id, params.id),
});
