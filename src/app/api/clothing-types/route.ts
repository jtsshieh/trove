import { getAllClothingTypesWithClothes } from '@/app/(app)/closet/clothing/_data/fetchers';
import { authedRoute } from '@/lib/api/http';

export const GET = authedRoute({
	handler: () => getAllClothingTypesWithClothes(),
});
