import { z } from 'zod';

import { editTripSchema } from '@/app/dashboard/(trip-viewer)/[tripId]/_data/schemas';
import * as service from '@/app/dashboard/(trip-viewer)/[tripId]/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ tripId: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: editTripSchema,
	handler: ({ user, params, body }) =>
		service.editTrip(user.id, params.tripId, body),
});

export const DELETE = authedRoute({
	params: paramsSchema,
	handler: ({ user, params }) => service.deleteTrip(user.id, params.tripId),
});
