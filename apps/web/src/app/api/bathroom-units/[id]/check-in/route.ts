import { z } from 'zod';

import * as service from '@/app/(app)/bathroom/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const POST = authedRoute({
	params: paramsSchema,
	handler: ({ user, params }) =>
		service.checkInBathroomUnit(user.id, params.id),
});
