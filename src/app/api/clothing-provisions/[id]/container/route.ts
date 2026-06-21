import { z } from 'zod';

import { moveProvisionToContainerSchema } from '@/app/(app)/trip-planner/[tripId]/containers/_provisioning/_data/schemas';
import * as service from '@/app/(app)/trip-planner/[tripId]/containers/_provisioning/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

// Move into / between containers (sets containerProvisionId + containerOrder).
export const PATCH = authedRoute({
	params: paramsSchema,
	body: moveProvisionToContainerSchema,
	handler: ({ user, params, body }) =>
		service.moveClothingProvisionToContainer(user.id, params.id, body),
});

// Pull the piece out of its container, back into the Unassigned pool.
export const DELETE = authedRoute({
	params: paramsSchema,
	handler: ({ user, params }) =>
		service.deleteClothingProvisionFromContainer(user.id, params.id),
});
