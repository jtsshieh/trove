import { z } from 'zod';

import { moveContainerProvisionToLuggageSchema } from '@/app/dashboard/(trip-viewer)/[tripId]/luggage/_provisioning/_data/schemas';
import * as service from '@/app/dashboard/(trip-viewer)/[tripId]/luggage/_provisioning/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: moveContainerProvisionToLuggageSchema,
	handler: ({ user, params, body }) =>
		service.moveContainerProvisionToLuggage(user.id, params.id, body),
});
