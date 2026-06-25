import { z } from 'zod';

import { addClothingToDaysSchema } from '@/app/(app)/trips/[tripId]/clothing/_data/schemas';
import * as service from '@/app/(app)/trips/[tripId]/clothing/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ tripId: z.string() });

export const POST = authedRoute({
	params: paramsSchema,
	body: addClothingToDaysSchema,
	handler: ({ user, params, body }) =>
		service.addClothingToDays(user.id, params.tripId, body.clothingId),
});
