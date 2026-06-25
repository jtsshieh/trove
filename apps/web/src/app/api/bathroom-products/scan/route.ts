import { scanBathroomImageSchema } from '@/app/(app)/bathroom/_data/schemas';
import * as service from '@/app/(app)/bathroom/_data/service';
import { authedRoute } from '@/lib/api/http';

export const POST = authedRoute({
	body: scanBathroomImageSchema,
	handler: ({ user, body }) =>
		service.scanBathroomImage(user.id, body.imageKey),
});
