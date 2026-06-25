import { z } from 'zod';

import { changeDocumentOrderSchema } from '@/app/(app)/documents/_data/schemas';
import * as service from '@/app/(app)/documents/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: changeDocumentOrderSchema,
	handler: ({ user, params, body }) =>
		service.reorderDocument(user.id, params.id, body.order),
});
