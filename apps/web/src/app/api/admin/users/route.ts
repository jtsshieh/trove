import { requireAdmin } from '@/lib/auth';
import { authedRoute } from '@/lib/api/http';
import { createUserSchema } from '@/lib/domains/admin/schemas';
import * as users from '@/lib/domains/admin/users';

export const GET = authedRoute({
	handler: ({ user }) => {
		requireAdmin(user);
		return users.getAllUsers();
	},
});

export const POST = authedRoute({
	body: createUserSchema,
	handler: ({ user, body }) => {
		requireAdmin(user);
		return users.adminCreateUser(body);
	},
});
