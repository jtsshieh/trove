import { scanLuggageImageSchema } from '@/app/dashboard/(main)/packing-gear/luggage/_data/schemas';
import * as service from '@/app/dashboard/(main)/packing-gear/luggage/_data/service';
import { authedRoute } from '@/lib/api/http';

export const POST = authedRoute({
	body: scanLuggageImageSchema,
	handler: ({ body }) => service.scanLuggageImage(body.imageKey),
});
