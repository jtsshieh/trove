import { scanContainerImageSchema } from '@/app/dashboard/(main)/packing-gear/containers/_data/schemas';
import * as service from '@/app/dashboard/(main)/packing-gear/containers/_data/service';
import { authedRoute } from '@/lib/api/http';

export const POST = authedRoute({
	body: scanContainerImageSchema,
	handler: ({ body }) => service.scanContainerImage(body.imageKey),
});
