import { z } from 'zod';

import * as service from '@/app/(app)/trip-planner/[tripId]/containers/_provisioning/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const DELETE = authedRoute({
	params: paramsSchema,
	handler: ({ user, params }) =>
		service.deleteContainerProvision(user.id, params.id),
});
