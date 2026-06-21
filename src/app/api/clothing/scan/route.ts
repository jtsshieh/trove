import { scanClothingImageSchema } from '@/app/(app)/closet/clothing/_data/schemas';
import * as service from '@/app/(app)/closet/clothing/_data/service';
import { authedRoute } from '@/lib/api/http';

export const POST = authedRoute({
	body: scanClothingImageSchema,
	handler: ({ body }) => service.scanClothingImage(body.imageKey),
});
