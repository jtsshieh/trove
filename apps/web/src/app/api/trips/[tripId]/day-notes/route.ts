import { z } from 'zod';

import { upsertTripDayNoteSchema } from '@/app/(app)/trips/[tripId]/clothing/_data/schemas';
import * as service from '@/app/(app)/trips/[tripId]/clothing/_data/service';
import { authedRoute } from '@/lib/api/http';

const paramsSchema = z.object({ tripId: z.string() });

export const PUT = authedRoute({
	params: paramsSchema,
	body: upsertTripDayNoteSchema,
	handler: ({ user, params, body }) =>
		service.upsertTripDayNote(user.id, params.tripId, body),
});
