import { z } from 'zod';

import { createEssentialProvisionsSchema } from '@/app/(app)/trip-planner/[tripId]/essentials/_data/schemas';
import * as service from '@/app/(app)/trip-planner/[tripId]/essentials/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ tripId: z.string() });

export const POST = authedRoute({
	params: paramsSchema,
	body: createEssentialProvisionsSchema,
	handler: ({ user, params, body }) =>
		service.createEssentialProvisions(user.id, params.tripId, body),
});
