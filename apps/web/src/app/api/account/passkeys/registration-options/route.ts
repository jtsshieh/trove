import * as service from '@/app/(auth)/_data/service';
import { authedRoute } from '@/lib/api/http';

export const GET = authedRoute({
	handler: ({ user }) => service.getRegistrationOptions(user),
});
