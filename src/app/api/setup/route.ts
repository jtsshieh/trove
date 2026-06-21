import { createFirstAdmin } from '@/lib/auth/setup';
import { publicRoute } from '@/lib/api/http';
import { setupSchema } from '@/lib/domains/setup/schemas';

// Public, but createFirstAdmin self-guards: only succeeds when zero users exist.
export const POST = publicRoute({
	body: setupSchema,
	handler: ({ body }) => createFirstAdmin(body.username, body.password),
});
