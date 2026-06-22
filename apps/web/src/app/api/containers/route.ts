import { getAllContainers } from '@/app/(app)/closet/packing-gear/containers/_data/fetchers';
import { createContainerSchema } from '@/app/(app)/closet/packing-gear/containers/_data/schemas';
import * as service from '@/app/(app)/closet/packing-gear/containers/_data/service';
import { authedRoute } from '@/lib/api/http';

export const GET = authedRoute({
	handler: () => getAllContainers(),
});

export const POST = authedRoute({
	body: createContainerSchema,
	handler: ({ user, body }) => service.createContainer(user.id, body),
});
