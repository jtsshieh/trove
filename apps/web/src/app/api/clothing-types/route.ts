import { getAllClothingTypesWithClothes } from '@/app/(app)/closet/clothing/_data/fetchers';
import { authedRoute } from '@/lib/api/http';
import { createClothingTypesSchema } from '@/lib/domains/clothing-types/schemas';
import * as service from '@/lib/domains/clothing-types/service';

// GET returns the user's clothing types WITH their pieces — the wardrobe grid
// payload (already user-scoped via the fetcher).
export const GET = authedRoute({
	handler: () => getAllClothingTypesWithClothes(),
});

// POST upserts types into the caller's own catalog (Closet "Types" manager + setup).
export const POST = authedRoute({
	body: createClothingTypesSchema,
	handler: ({ user, body }) => service.createClothingTypes(user.id, body.types),
});
