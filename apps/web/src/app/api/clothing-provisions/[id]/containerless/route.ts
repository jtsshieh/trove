import { z } from 'zod';

import * as service from '@/app/(app)/trips/[tripId]/containers/_provisioning/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

// Mark a clothing piece "containerless" — packed directly into a suitcase.
export const PATCH = authedRoute({
	params: paramsSchema,
	handler: ({ user, params }) =>
		service.setClothingProvisionContainerless(user.id, params.id),
});
