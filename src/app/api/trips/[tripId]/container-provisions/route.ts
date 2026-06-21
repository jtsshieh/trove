import { z } from 'zod';

import { createContainerProvisionSchema } from '@/app/dashboard/(trip-viewer)/[tripId]/containers/_provisioning/_data/schemas';
import * as service from '@/app/dashboard/(trip-viewer)/[tripId]/containers/_provisioning/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ tripId: z.string() });

export const POST = authedRoute({
	params: paramsSchema,
	body: createContainerProvisionSchema,
	handler: ({ user, params, body }) =>
		service.createContainerProvision(user.id, params.tripId, body),
});
