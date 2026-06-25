import { scanDocumentImageSchema } from '@/app/(app)/documents/_data/schemas';
import * as service from '@/app/(app)/documents/_data/service';
import { authedRoute } from '@/lib/api/http';

export const POST = authedRoute({
	body: scanDocumentImageSchema,
	handler: ({ user, body }) =>
		service.scanDocumentImage(user.id, body.imageKey),
});
