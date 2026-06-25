import { z } from 'zod';

import { changeElectronicOrderSchema } from '@/app/(app)/electronics/_data/schemas';
import * as service from '@/app/(app)/electronics/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: changeElectronicOrderSchema,
	handler: ({ user, params, body }) =>
		service.reorderElectronic(user.id, params.id, body.order),
});
