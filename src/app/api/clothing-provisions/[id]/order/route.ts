import { z } from 'zod';

import { changeClothingProvisionDayOrderSchema } from '@/app/(app)/trip-planner/[tripId]/clothing/_data/schemas';
import * as service from '@/app/(app)/trip-planner/[tripId]/clothing/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: changeClothingProvisionDayOrderSchema,
	handler: ({ user, params, body }) =>
		service.changeClothingProvisionDayOrder(user.id, params.id, body.dayOrder),
});
