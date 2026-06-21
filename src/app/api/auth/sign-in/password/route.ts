import { passwordSignInSchema } from '@/app/(auth)/_data/schemas';
import * as service from '@/app/(auth)/_data/service';
import { publicRoute } from '@/lib/api/http';

export const POST = publicRoute({
	body: passwordSignInSchema,
	handler: ({ body }) => service.signInWithPassword(body.username, body.password),
});
