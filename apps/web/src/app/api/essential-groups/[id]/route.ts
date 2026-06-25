import { z } from 'zod';

import { editEssentialGroupSchema } from '@/app/(app)/trips/templates/_data/schemas';
import * as service from '@/app/(app)/trips/templates/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: editEssentialGroupSchema,
	handler: ({ user, params, body }) =>
		service.editEssentialGroup(user.id, params.id, body),
});

export const DELETE = authedRoute({
	params: paramsSchema,
	handler: ({ user, params }) =>
		service.deleteEssentialGroup(user.id, params.id),
});
