import { z } from 'zod';

import { renameTripEssentialGroupSchema } from '@/app/dashboard/(trip-viewer)/[tripId]/essentials/_data/schemas';
import * as service from '@/app/dashboard/(trip-viewer)/[tripId]/essentials/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: renameTripEssentialGroupSchema,
	handler: ({ user, params, body }) =>
		service.renameTripEssentialGroup(user.id, params.id, body),
});

export const DELETE = authedRoute({
	params: paramsSchema,
	handler: ({ user, params }) =>
		service.deleteTripEssentialGroup(user.id, params.id),
});
