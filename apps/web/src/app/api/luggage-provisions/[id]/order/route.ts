import { z } from 'zod';

import { changeLuggageProvisionTripOrderSchema } from '@/app/(app)/trip-planner/[tripId]/luggage/_provisioning/_data/schemas';
import * as service from '@/app/(app)/trip-planner/[tripId]/luggage/_provisioning/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: changeLuggageProvisionTripOrderSchema,
	handler: ({ user, params, body }) =>
		service.changeLuggageProvisionTripOrder(user.id, params.id, body.tripOrder),
});
