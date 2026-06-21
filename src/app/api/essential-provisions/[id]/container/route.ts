import { z } from 'zod';

import { moveProvisionToContainerSchema } from '@/app/dashboard/(trip-viewer)/[tripId]/containers/_provisioning/_data/schemas';
import * as service from '@/app/dashboard/(trip-viewer)/[tripId]/containers/_provisioning/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

// Move into / between containers (sets containerProvisionId + containerOrder).
export const PATCH = authedRoute({
	params: paramsSchema,
	body: moveProvisionToContainerSchema,
	handler: ({ user, params, body }) =>
		service.moveEssentialProvisionToContainer(user.id, params.id, body),
});

// Pull the essential out of its container, back into the Unassigned pool.
export const DELETE = authedRoute({
	params: paramsSchema,
	handler: ({ user, params }) =>
		service.deleteEssentialProvisionFromContainer(user.id, params.id),
});
