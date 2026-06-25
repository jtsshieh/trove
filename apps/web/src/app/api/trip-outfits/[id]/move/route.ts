import { z } from 'zod';

import { moveTripOutfitToDaySchema } from '@/app/(app)/trips/[tripId]/clothing/_data/schemas';
import * as service from '@/app/(app)/trips/[tripId]/clothing/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: moveTripOutfitToDaySchema,
	handler: ({ user, params, body }) =>
		service.moveTripOutfitToDay(user.id, params.id, body),
});
