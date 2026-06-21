import { z } from 'zod';

import { editLuggageSchema } from '@/app/dashboard/(main)/packing-gear/luggage/_data/schemas';
import * as service from '@/app/dashboard/(main)/packing-gear/luggage/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: editLuggageSchema,
	handler: ({ user, params, body }) =>
		service.editLuggage(user.id, params.id, body),
});

export const DELETE = authedRoute({
	params: paramsSchema,
	handler: ({ user, params }) => service.deleteLuggage(user.id, params.id),
});
