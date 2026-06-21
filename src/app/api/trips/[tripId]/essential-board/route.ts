import { z } from 'zod';

import { getEssentialsBoardData } from '@/app/dashboard/(trip-viewer)/[tripId]/essentials/_data/fetchers';
import { ApiError } from '@/lib/api/errors';
import { authedRoute } from '@/lib/api/http';
import { requireTrip } from '@/lib/api/ownership';

const paramsSchema = z.object({ tripId: z.string() });

export const GET = authedRoute({
	params: paramsSchema,
	handler: async ({ user, params }) => {
		await requireTrip(user.id, params.tripId);
		const data = await getEssentialsBoardData(params.tripId);
		if (!data) throw new ApiError(404, 'Trip not found');
		return data;
	},
});
