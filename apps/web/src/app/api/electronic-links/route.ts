import { createElectronicLinkSchema } from '@/app/(app)/electronics/_data/schemas';
import * as service from '@/app/(app)/electronics/_data/service';
import { authedRoute } from '@/lib/api/http';

export const POST = authedRoute({
	body: createElectronicLinkSchema,
	handler: ({ user, body }) =>
		service.linkAccessory(user.id, body.deviceId, body.accessoryId),
});
