import { z } from 'zod';

import { saveTripOutfitAsTemplateSchema } from '@/app/(app)/trip-planner/[tripId]/clothing/_data/schemas';
import * as service from '@/app/(app)/trip-planner/[tripId]/clothing/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const POST = authedRoute({
	params: paramsSchema,
	body: saveTripOutfitAsTemplateSchema,
	handler: ({ user, params, body }) =>
		service.saveTripOutfitAsTemplate(user.id, params.id, body.name),
});
