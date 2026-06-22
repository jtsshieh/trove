import * as service from '@/app/(app)/account/_data/service';
import { authedRoute } from '@/lib/api/http';

export const DELETE = authedRoute({
	handler: ({ user }) => service.deleteUser(user.id),
});
