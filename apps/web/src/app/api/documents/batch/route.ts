import { createDocumentBatchSchema } from '@/app/(app)/documents/_data/schemas';
import * as service from '@/app/(app)/documents/_data/service';
import { authedRoute } from '@/lib/api/http';

export const POST = authedRoute({
	body: createDocumentBatchSchema,
	handler: ({ user, body }) => service.createDocumentBatch(user.id, body.items),
});
