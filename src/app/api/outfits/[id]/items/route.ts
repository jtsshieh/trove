import { z } from 'zod';

import { addOutfitItemSchema } from '@/app/dashboard/(main)/outfits/_data/schemas';
import * as service from '@/app/dashboard/(main)/outfits/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const POST = authedRoute({
	params: paramsSchema,
	body: addOutfitItemSchema,
	handler: ({ user, params, body }) =>
		service.addOutfitItem(user.id, params.id, body),
});
