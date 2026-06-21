import { updateUserSettingsSchema } from '@/app/dashboard/(main)/account/_data/schemas';
import * as service from '@/app/dashboard/(main)/account/_data/service';
import { authedRoute } from '@/lib/api/http';

export const PATCH = authedRoute({
	body: updateUserSettingsSchema,
	handler: ({ user, body }) => service.updateUserSettings(user.id, body),
});
