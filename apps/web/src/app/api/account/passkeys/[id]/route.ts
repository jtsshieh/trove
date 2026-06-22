import { z } from 'zod';

import { renamePasskeySchema } from '@/app/(auth)/_data/schemas';
import * as service from '@/app/(auth)/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: renamePasskeySchema,
	handler: ({ user, params, body }) =>
		service.renamePasskey(user.id, params.id, body.name),
});

export const DELETE = authedRoute({
	params: paramsSchema,
	handler: ({ user, params }) => service.deletePasskey(user.id, params.id),
});
