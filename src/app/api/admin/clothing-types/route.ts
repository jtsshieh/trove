import { requireAdmin } from '@/lib/auth';
import { authedRoute } from '@/lib/api/http';
import { createClothingTypesSchema } from '@/lib/domains/clothing-types/schemas';
import * as service from '@/lib/domains/clothing-types/service';

export const POST = authedRoute({
	body: createClothingTypesSchema,
	handler: ({ user, body }) => {
		requireAdmin(user);
		return service.createClothingTypes(body.types);
	},
});
