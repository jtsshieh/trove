import { z } from 'zod';

import { changeProvisionContainerOrderSchema } from '@/app/(app)/trips/[tripId]/containers/_provisioning/_data/schemas';
import * as service from '@/app/(app)/trips/[tripId]/containers/_provisioning/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: changeProvisionContainerOrderSchema,
	handler: ({ user, params, body }) =>
		service.changeEssentialProvisionContainerOrder(
			user.id,
			params.id,
			body.containerOrder,
		),
});
