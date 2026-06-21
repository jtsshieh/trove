import { z } from 'zod';

import { changeOutfitOrderSchema } from '@/app/dashboard/(main)/outfits/_data/schemas';
import * as service from '@/app/dashboard/(main)/outfits/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: changeOutfitOrderSchema,
	handler: ({ user, params, body }) =>
		service.reorderOutfit(user.id, params.id, body.order),
});
