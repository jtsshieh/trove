import { requireAdmin } from '@/lib/auth';
import { authedRoute } from '@/lib/api/http';
import { setRoleSchema, userIdParamSchema } from '@/lib/domains/admin/schemas';
import * as users from '@/lib/domains/admin/users';

export const DELETE = authedRoute({
	params: userIdParamSchema,
	handler: ({ user, params }) => {
		requireAdmin(user);
		return users.adminDeleteUser(user.id, params.id);
	},
});

export const PATCH = authedRoute({
	params: userIdParamSchema,
	body: setRoleSchema,
	handler: ({ user, params, body }) => {
		requireAdmin(user);
		return users.adminSetRole(params.id, body.role);
	},
});
