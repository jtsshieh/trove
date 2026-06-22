import { requireAdmin } from '@/app/(app)/account/_data/fetchers';
import * as service from '@/app/(app)/admin/system/_data/service';
import { authedRoute } from '@/lib/api/http';

export const POST = authedRoute({
	handler: ({ user }) => {
		requireAdmin(user);
		return service.checkForUpdate();
	},
});
