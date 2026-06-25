import { z } from 'zod';

import { setLuggageProvisionKindSchema } from '@/app/(app)/trips/[tripId]/luggage/_provisioning/_data/schemas';
import * as service from '@/app/(app)/trips/[tripId]/luggage/_provisioning/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: setLuggageProvisionKindSchema,
	handler: ({ user, params, body }) =>
		service.setLuggageProvisionKind(user.id, params.id, body),
});
