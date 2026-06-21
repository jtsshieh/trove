import { z } from 'zod';

import { changeTripModeSchema } from '@/app/dashboard/(trip-viewer)/[tripId]/_data/schemas';
import * as service from '@/app/dashboard/(trip-viewer)/[tripId]/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ tripId: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: changeTripModeSchema,
	handler: ({ user, params, body }) =>
		service.changeTripMode(user.id, params.tripId, body.mode),
});
