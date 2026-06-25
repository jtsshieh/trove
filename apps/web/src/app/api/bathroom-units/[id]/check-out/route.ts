import { z } from 'zod';

import { checkOutBathroomUnitSchema } from '@/app/(app)/bathroom/_data/schemas';
import * as service from '@/app/(app)/bathroom/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const POST = authedRoute({
	params: paramsSchema,
	body: checkOutBathroomUnitSchema,
	handler: ({ user, params, body }) =>
		service.checkOutBathroomUnit(user.id, params.id, body.tripId),
});
