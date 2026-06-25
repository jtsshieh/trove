import { getAllOutfits } from '@/app/(app)/closet/outfits/_data/fetchers';
import { createOutfitSchema } from '@/app/(app)/closet/outfits/_data/schemas';
import * as service from '@/app/(app)/closet/outfits/_data/service';
import { authedRoute } from '@/lib/api/http';

export const GET = authedRoute({
	handler: () => getAllOutfits(),
});

export const POST = authedRoute({
	body: createOutfitSchema,
	handler: ({ user, body }) => service.createOutfit(user.id, body),
});
