import { z } from 'zod';

import * as service from '@/app/dashboard/(trip-viewer)/[tripId]/essentials/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const DELETE = authedRoute({
	params: paramsSchema,
	handler: ({ user, params }) =>
		service.deleteEssentialProvision(user.id, params.id),
});
