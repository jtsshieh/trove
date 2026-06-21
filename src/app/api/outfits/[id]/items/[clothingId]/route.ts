import { z } from 'zod';

import * as service from '@/app/(app)/outfits/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ id: z.string(), clothingId: z.string() });

export const DELETE = authedRoute({
	params: paramsSchema,
	handler: ({ user, params }) =>
		service.removeOutfitItem(user.id, params.id, params.clothingId),
});
