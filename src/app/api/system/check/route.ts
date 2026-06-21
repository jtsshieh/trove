import { requireAdmin } from '@/app/dashboard/(main)/account/_data/fetchers';
import * as service from '@/app/dashboard/(main)/system/_data/service';
import { authedRoute } from '@/lib/api/http';

export const POST = authedRoute({
	handler: ({ user }) => {
		requireAdmin(user);
		return service.checkForUpdate();
	},
});
