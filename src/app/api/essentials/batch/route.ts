import { createEssentialBatchSchema } from '@/app/dashboard/(main)/essentials/_data/schemas';
import * as service from '@/app/dashboard/(main)/essentials/_data/service';
import { authedRoute } from '@/lib/api/http';

export const POST = authedRoute({
	body: createEssentialBatchSchema,
	handler: ({ user, body }) => service.createEssentialBatch(user.id, body.items),
});
