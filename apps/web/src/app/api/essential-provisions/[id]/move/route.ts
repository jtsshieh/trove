import { z } from 'zod';

import { moveEssentialProvisionSchema } from '@/app/(app)/trips/[tripId]/essentials/_data/schemas';
import * as service from '@/app/(app)/trips/[tripId]/essentials/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: moveEssentialProvisionSchema,
	handler: ({ user, params, body }) =>
		service.moveEssentialProvision(user.id, params.id, body),
});
