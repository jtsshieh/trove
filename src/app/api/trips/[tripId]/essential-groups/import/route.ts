import { z } from 'zod';

import { importEssentialGroupSchema } from '@/app/dashboard/(trip-viewer)/[tripId]/essentials/_data/schemas';
import * as service from '@/app/dashboard/(trip-viewer)/[tripId]/essentials/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ tripId: z.string() });

export const POST = authedRoute({
	params: paramsSchema,
	body: importEssentialGroupSchema,
	handler: ({ user, params, body }) =>
		service.importEssentialGroup(user.id, params.tripId, body),
});
