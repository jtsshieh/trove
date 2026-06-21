import { requireAdmin } from '@/lib/auth';
import { authedRoute } from '@/lib/api/http';
import { clothingTypeNameParamSchema } from '@/lib/domains/clothing-types/schemas';
import * as service from '@/lib/domains/clothing-types/service';

export const DELETE = authedRoute({
	params: clothingTypeNameParamSchema,
	handler: ({ user, params }) => {
		requireAdmin(user);
		return service.deleteClothingType(params.name);
	},
});
