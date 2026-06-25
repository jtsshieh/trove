import { z } from 'zod';

import { editOutfitSchema } from '@/app/(app)/closet/outfits/_data/schemas';
import * as service from '@/app/(app)/closet/outfits/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string() });

export const PATCH = authedRoute({
	params: paramsSchema,
	body: editOutfitSchema,
	handler: ({ user, params, body }) =>
		service.editOutfit(user.id, params.id, body),
});

export const DELETE = authedRoute({
	params: paramsSchema,
	handler: ({ user, params }) => service.deleteOutfit(user.id, params.id),
});
