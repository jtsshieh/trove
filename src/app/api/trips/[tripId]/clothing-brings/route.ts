import { z } from 'zod';

import { setClothingBringingSchema } from '@/app/dashboard/(trip-viewer)/[tripId]/clothing/_data/schemas';
import * as service from '@/app/dashboard/(trip-viewer)/[tripId]/clothing/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ tripId: z.string() });

export const PUT = authedRoute({
	params: paramsSchema,
	body: setClothingBringingSchema,
	handler: ({ user, params, body }) =>
		service.setClothingBringing(user.id, params.tripId, body),
});
