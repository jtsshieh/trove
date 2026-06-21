import { requireAdmin } from '@/lib/auth';
import { authedRoute } from '@/lib/api/http';
import {
	resetPasswordSchema,
	userIdParamSchema,
} from '@/lib/domains/admin/schemas';
import * as users from '@/lib/domains/admin/users';

export const PATCH = authedRoute({
	params: userIdParamSchema,
	body: resetPasswordSchema,
	handler: ({ user, params, body }) => {
		requireAdmin(user);
		return users.adminResetPassword(params.id, body.password);
	},
});
