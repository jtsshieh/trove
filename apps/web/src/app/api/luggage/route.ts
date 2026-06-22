import { getAllLuggage } from '@/app/(app)/closet/packing-gear/luggage/_data/fetchers';
import { createLuggageSchema } from '@/app/(app)/closet/packing-gear/luggage/_data/schemas';
import * as service from '@/app/(app)/closet/packing-gear/luggage/_data/service';
import { authedRoute } from '@/lib/api/http';

export const GET = authedRoute({
	handler: () => getAllLuggage(),
});

export const POST = authedRoute({
	body: createLuggageSchema,
	handler: ({ user, body }) => service.createLuggage(user.id, body),
});
