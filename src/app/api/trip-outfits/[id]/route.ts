import { z } from 'zod';

import { renameTripOutfitSchema } from '@/app/dashboard/(trip-viewer)/[tripId]/clothing/_data/schemas';
import * as service from '@/app/dashboard/(trip-viewer)/[tripId]/clothing/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: renameTripOutfitSchema,
	handler: ({ user, params, body }) =>
		service.renameTripOutfit(user.id, params.id, body.name),
});

export const DELETE = authedRoute({
	params: paramsSchema,
	handler: ({ user, params }) => service.deleteTripOutfit(user.id, params.id),
});
