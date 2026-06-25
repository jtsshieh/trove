import { getAllDocuments } from '@/app/(app)/documents/_data/fetchers';
import { createDocumentSchema } from '@/app/(app)/documents/_data/schemas';
import * as service from '@/app/(app)/documents/_data/service';
import { authedRoute } from '@/lib/api/http';

export const GET = authedRoute({
	handler: () => getAllDocuments(),
});

export const POST = authedRoute({
	body: createDocumentSchema,
	handler: ({ user, body }) => service.createDocument(user.id, body),
});
