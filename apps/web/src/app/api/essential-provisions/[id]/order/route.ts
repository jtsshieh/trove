import { z } from 'zod';

import { changeEssentialProvisionDayOrderSchema } from '@/app/(app)/trips/[tripId]/essentials/_data/schemas';
import * as service from '@/app/(app)/trips/[tripId]/essentials/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: changeEssentialProvisionDayOrderSchema,
	handler: ({ user, params, body }) =>
		service.changeEssentialProvisionDayOrder(user.id, params.id, body.dayOrder),
});
