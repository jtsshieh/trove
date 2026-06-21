import { scanClothingImageSchema } from '@/app/dashboard/(main)/wardrobe/_data/schemas';
import * as service from '@/app/dashboard/(main)/wardrobe/_data/service';
import { authedRoute } from '@/lib/api/http';

export const POST = authedRoute({
	body: scanClothingImageSchema,
	handler: ({ body }) => service.scanClothingImage(body.imageKey),
});
