import { z } from 'zod';

import { createClothingProvisionsSchema } from '@/app/(app)/trip-planner/[tripId]/clothing/_data/schemas';
import * as service from '@/app/(app)/trip-planner/[tripId]/clothing/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ tripId: z.string() });

export const POST = authedRoute({
	params: paramsSchema,
	body: createClothingProvisionsSchema,
	handler: ({ user, params, body }) =>
		service.createClothingProvisions(user.id, params.tripId, body),
});
