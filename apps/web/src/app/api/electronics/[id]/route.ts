import { z } from 'zod';

import { editElectronicSchema } from '@/app/(app)/electronics/_data/schemas';
import * as service from '@/app/(app)/electronics/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: editElectronicSchema,
	handler: ({ user, params, body }) =>
		service.editElectronic(user.id, params.id, body),
});

export const DELETE = authedRoute({
	params: paramsSchema,
	handler: ({ user, params }) => service.deleteElectronic(user.id, params.id),
});
