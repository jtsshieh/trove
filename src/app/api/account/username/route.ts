import { changeUsernameSchema } from '@/app/(app)/account/_data/schemas';
import * as service from '@/app/(app)/account/_data/service';
import { authedRoute } from '@/lib/api/http';

export const PATCH = authedRoute({
	body: changeUsernameSchema,
	handler: ({ user, body }) => service.changeUsername(user.id, body.username),
});
