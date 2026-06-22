import { z } from 'zod';

import { markClothingProvisionPackedSchema } from '@/app/(app)/trip-planner/[tripId]/containers/_packing/_data/schemas';
import * as service from '@/app/(app)/trip-planner/[tripId]/containers/_packing/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: markClothingProvisionPackedSchema,
	handler: ({ user, params, body }) =>
		service.markClothingProvisionPacked(user.id, params.id, body),
});
