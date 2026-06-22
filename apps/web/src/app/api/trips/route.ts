import { getAllTrips } from '@/app/(app)/trip-planner/[tripId]/_data/fetchers';
import { createTripSchema } from '@/app/(app)/trip-planner/[tripId]/_data/schemas';
import * as service from '@/app/(app)/trip-planner/[tripId]/_data/service';
import { authedRoute } from '@/lib/api/http';

export const GET = authedRoute({
	handler: () => getAllTrips(),
});

export const POST = authedRoute({
	body: createTripSchema,
	handler: ({ user, body }) => service.createTrip(user.id, body),
});
