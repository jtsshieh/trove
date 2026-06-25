import { getAllBathroomBatches } from '@/app/(app)/bathroom/_data/fetchers';
import { authedRoute } from '@/lib/api/http';

export const GET = authedRoute({
	handler: () => getAllBathroomBatches(),
});
