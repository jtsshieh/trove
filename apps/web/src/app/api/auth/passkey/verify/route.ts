import { verifyAuthenticationSchema } from '@/app/(auth)/_data/schemas';
import * as service from '@/app/(auth)/_data/service';
import { publicRoute } from '@/lib/api/http';

export const POST = publicRoute({
	body: verifyAuthenticationSchema,
	handler: ({ body }) => service.verifyAuthentication(body.authenticationResponse),
});
