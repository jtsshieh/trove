import { z } from 'zod';

import { deleteClothingProvisionSchema } from '@/app/(app)/trips/[tripId]/clothing/_data/schemas';
import * as service from '@/app/(app)/trips/[tripId]/clothing/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

// `force` (sent in the DELETE body) skips the "reused N×" warning. Absent → undefined.
const bodySchema = deleteClothingProvisionSchema.optional();

export const DELETE = authedRoute({
	params: paramsSchema,
	body: bodySchema,
	handler: ({ user, params, body }) =>
		service.deleteClothingProvision(user.id, params.id, body?.force),
});
