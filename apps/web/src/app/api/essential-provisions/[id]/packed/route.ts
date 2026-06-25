import { z } from 'zod';

import { markEssentialProvisionPackedSchema } from '@/app/(app)/trips/[tripId]/containers/_packing/_data/schemas';
import * as service from '@/app/(app)/trips/[tripId]/containers/_packing/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: markEssentialProvisionPackedSchema,
	handler: ({ user, params, body }) =>
		service.markEssentialProvisionPacked(user.id, params.id, body),
});
