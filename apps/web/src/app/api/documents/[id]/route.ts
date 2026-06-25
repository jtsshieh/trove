import { z } from 'zod';

import { editDocumentSchema } from '@/app/(app)/documents/_data/schemas';
import * as service from '@/app/(app)/documents/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: editDocumentSchema,
	handler: ({ user, params, body }) =>
		service.editDocument(user.id, params.id, body),
});

export const DELETE = authedRoute({
	params: paramsSchema,
	handler: ({ user, params }) => service.deleteDocument(user.id, params.id),
});
