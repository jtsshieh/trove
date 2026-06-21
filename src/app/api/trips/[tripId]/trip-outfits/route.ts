import { z } from 'zod';

import {
	assignOutfitToDaysSchema,
	createAdHocTripOutfitSchema,
} from '@/app/dashboard/(trip-viewer)/[tripId]/clothing/_data/schemas';
import * as service from '@/app/dashboard/(trip-viewer)/[tripId]/clothing/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ tripId: z.string() });

// One endpoint, two creators: a body carrying `outfitId` materializes a template
// onto days; otherwise it's an ad-hoc grouping created on a single day.
const bodySchema = z.union([
	assignOutfitToDaysSchema,
	createAdHocTripOutfitSchema,
]);

export const POST = authedRoute({
	params: paramsSchema,
	body: bodySchema,
	handler: ({ user, params, body }) =>
		'outfitId' in body
			? service.assignOutfitToDays(user.id, params.tripId, body)
			: service.createAdHocTripOutfit(user.id, params.tripId, body),
});
