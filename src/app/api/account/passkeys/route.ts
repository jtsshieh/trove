import { verifyRegistrationSchema } from '@/app/(auth)/_data/schemas';
import * as service from '@/app/(auth)/_data/service';
import { authedRoute } from '@/lib/api/http';

export const POST = authedRoute({
	body: verifyRegistrationSchema,
	handler: ({ user, body }) =>
		service.verifyRegistration(
			user,
			body.attestationResponse,
			body.webauthnUserId,
		),
});
