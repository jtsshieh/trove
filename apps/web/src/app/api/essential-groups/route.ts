import { getTemplatesPageData } from '@/app/(app)/trips/templates/_data/fetchers';
import { createEssentialGroupSchema } from '@/app/(app)/trips/templates/_data/schemas';
import * as service from '@/app/(app)/trips/templates/_data/service';
import { authedRoute } from '@/lib/api/http';

export const GET = authedRoute({
	handler: () => getTemplatesPageData(),
});

export const POST = authedRoute({
	body: createEssentialGroupSchema,
	handler: ({ user, body }) => service.createEssentialGroup(user.id, body),
});
