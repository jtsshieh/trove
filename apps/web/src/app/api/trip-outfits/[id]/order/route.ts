import { z } from 'zod';

import { changeTripOutfitOrderSchema } from '@/app/(app)/trip-planner/[tripId]/clothing/_data/schemas';
import * as service from '@/app/(app)/trip-planner/[tripId]/clothing/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: changeTripOutfitOrderSchema,
	handler: ({ user, params, body }) =>
		service.changeTripOutfitOrder(user.id, params.id, body.order),
});
