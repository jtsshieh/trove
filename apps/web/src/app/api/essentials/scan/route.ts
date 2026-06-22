import { scanEssentialImageSchema } from '@/app/(app)/closet/essentials/_data/schemas';
import * as service from '@/app/(app)/closet/essentials/_data/service';
import { authedRoute } from '@/lib/api/http';

export const POST = authedRoute({
	body: scanEssentialImageSchema,
	handler: ({ body }) => service.scanEssentialImage(body.imageKey),
});
