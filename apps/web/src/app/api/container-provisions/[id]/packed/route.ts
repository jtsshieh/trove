import { z } from 'zod';

import { markContainerPackedSchema } from '@/app/(app)/trip-planner/[tripId]/luggage/_packing/_data/schemas';
import * as service from '@/app/(app)/trip-planner/[tripId]/luggage/_packing/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: markContainerPackedSchema,
	handler: ({ user, params, body }) =>
		service.markContainerPacked(user.id, params.id, body),
});
