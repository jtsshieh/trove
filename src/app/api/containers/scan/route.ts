import { scanContainerImageSchema } from '@/app/(app)/closet/packing-gear/containers/_data/schemas';
import * as service from '@/app/(app)/closet/packing-gear/containers/_data/service';
import { authedRoute } from '@/lib/api/http';

export const POST = authedRoute({
	body: scanContainerImageSchema,
	handler: ({ body }) => service.scanContainerImage(body.imageKey),
});
