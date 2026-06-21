import { getAllClothingTypesWithClothes } from '@/app/dashboard/(main)/wardrobe/_data/fetchers';
import { authedRoute } from '@/lib/api/http';

export const GET = authedRoute({
	handler: () => getAllClothingTypesWithClothes(),
});
