import * as service from '@/app/(auth)/_data/service';
import { publicRoute } from '@/lib/api/http';

export const POST = publicRoute({
	handler: () => service.getPasskeyOptions(),
});
