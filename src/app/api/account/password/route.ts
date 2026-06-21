import { authedRoute } from '@/lib/api/http';
import {
	changePassword,
	changePasswordSchema,
} from '@/lib/domains/account/password';

export const PATCH = authedRoute({
	body: changePasswordSchema,
	handler: ({ user, body }) => changePassword(user.id, body),
});
