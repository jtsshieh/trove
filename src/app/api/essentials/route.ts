import { getAllEssentials } from '@/app/dashboard/(main)/essentials/_data/fetchers';
import { createEssentialSchema } from '@/app/dashboard/(main)/essentials/_data/schemas';
import * as service from '@/app/dashboard/(main)/essentials/_data/service';
import { authedRoute } from '@/lib/api/http';

export const GET = authedRoute({
	handler: () => getAllEssentials(),
});

export const POST = authedRoute({
	body: createEssentialSchema,
	handler: ({ user, body }) => service.createEssential(user.id, body),
});
