import { getAllOutfits } from '@/app/dashboard/(main)/outfits/_data/fetchers';
import { createOutfitSchema } from '@/app/dashboard/(main)/outfits/_data/schemas';
import * as service from '@/app/dashboard/(main)/outfits/_data/service';
import { authedRoute } from '@/lib/api/http';

export const GET = authedRoute({
	handler: () => getAllOutfits(),
});

export const POST = authedRoute({
	body: createOutfitSchema,
	handler: ({ user, body }) => service.createOutfit(user.id, body),
});
