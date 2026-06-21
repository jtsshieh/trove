import { authedRoute } from '@/lib/api/http';
import { clothingTypeNameParamSchema } from '@/lib/domains/clothing-types/schemas';
import * as service from '@/lib/domains/clothing-types/service';

// Delete a type from the caller's own catalog (409s if any of their pieces use it).
export const DELETE = authedRoute({
	params: clothingTypeNameParamSchema,
	handler: ({ user, params }) =>
		service.deleteClothingType(user.id, params.name),
});
