import { z } from 'zod';

import { moveProvisionToLuggageSchema } from '@/app/(app)/trip-planner/[tripId]/luggage/_provisioning/_data/schemas';
import * as service from '@/app/(app)/trip-planner/[tripId]/luggage/_provisioning/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: moveProvisionToLuggageSchema,
	handler: ({ user, params, body }) =>
		service.moveClothingProvisionToLuggage(user.id, params.id, body),
});
