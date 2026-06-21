import { signUpSchema } from '@/app/(auth)/_data/schemas';
import * as service from '@/app/dashboard/(main)/account/_data/service';
import { publicRoute } from '@/lib/api/http';

export const POST = publicRoute({
	body: signUpSchema,
	handler: ({ body }) => service.createUser(body.username, body.password),
});
