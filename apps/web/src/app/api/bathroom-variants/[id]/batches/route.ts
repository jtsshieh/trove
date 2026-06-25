import { z } from 'zod';

import { addBathroomBatchSchema } from '@/app/(app)/bathroom/_data/schemas';
import * as service from '@/app/(app)/bathroom/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const POST = authedRoute({
	params: paramsSchema,
	body: addBathroomBatchSchema,
	handler: ({ user, params, body }) =>
		service.addBathroomBatch(user.id, params.id, body),
});
