import { scanElectronicImageSchema } from '@/app/(app)/electronics/_data/schemas';
import * as service from '@/app/(app)/electronics/_data/service';
import { authedRoute } from '@/lib/api/http';

export const POST = authedRoute({
	body: scanElectronicImageSchema,
	handler: ({ user, body }) =>
		service.scanElectronicImage(user.id, body.imageKey),
});
