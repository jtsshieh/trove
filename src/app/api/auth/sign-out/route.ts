import * as service from '@/app/(auth)/_data/service';
import { authedRoute } from '@/lib/api/http';

export const POST = authedRoute({
	handler: () => service.signOut(),
});
