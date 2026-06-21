import { z } from 'zod';

import { createLuggageProvisionSchema } from '@/app/dashboard/(trip-viewer)/[tripId]/luggage/_provisioning/_data/schemas';
import * as service from '@/app/dashboard/(trip-viewer)/[tripId]/luggage/_provisioning/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ tripId: z.string() });

export const POST = authedRoute({
	params: paramsSchema,
	body: createLuggageProvisionSchema,
	handler: ({ user, params, body }) =>
		service.createLuggageProvision(user.id, params.tripId, body),
});
