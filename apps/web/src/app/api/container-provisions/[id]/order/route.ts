import { z } from 'zod';

import { changeContainerProvisionTripOrderSchema } from '@/app/(app)/trip-planner/[tripId]/containers/_provisioning/_data/schemas';
import * as service from '@/app/(app)/trip-planner/[tripId]/containers/_provisioning/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: changeContainerProvisionTripOrderSchema,
	handler: ({ user, params, body }) =>
		service.changeContainerProvisionTripOrder(
			user.id,
			params.id,
			body.tripOrder,
		),
});
