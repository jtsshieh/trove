import { getAllEssentialGroups } from '@/app/(app)/closet/essentials/_data/fetchers';
import { createEssentialGroupSchema } from '@/app/(app)/closet/essentials/_data/schemas';
import * as service from '@/app/(app)/closet/essentials/_data/service';
import { authedRoute } from '@/lib/api/http';

export const GET = authedRoute({
	handler: () => getAllEssentialGroups(),
});

export const POST = authedRoute({
	body: createEssentialGroupSchema,
	handler: ({ user, body }) => service.createEssentialGroup(user.id, body),
});
