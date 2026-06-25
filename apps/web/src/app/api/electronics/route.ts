import { getAllElectronics } from '@/app/(app)/electronics/_data/fetchers';
import { createElectronicSchema } from '@/app/(app)/electronics/_data/schemas';
import * as service from '@/app/(app)/electronics/_data/service';
import { authedRoute } from '@/lib/api/http';

export const GET = authedRoute({
	handler: () => getAllElectronics(),
});

export const POST = authedRoute({
	body: createElectronicSchema,
	handler: ({ user, body }) => service.createElectronic(user.id, body),
});
