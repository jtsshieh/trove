import { TripMode } from '@/generated/prisma/enums';
import { ApiError } from '@/lib/api/errors';
import { prisma } from '@/lib/db.server';

import type { CreateTripInput, EditTripInput } from './schemas';

/**
 * Server-side write logic for trips. Trips are user-scoped, so ownership is
 * enforced here (every mutating function takes the caller's `userId` and 404s on
 * a row it doesn't own), replacing the old next-safe-action ownership middleware.
 *
 * Focused on trip-level CRUD only — the per-trip board provisions are owned by a
 * later wave and stay in their own modules.
 */

/** Loads a trip, 404ing if it doesn't belong to `userId`. */
async function requireTrip(userId: string, id: string) {
	const trip = await prisma.trip.findUnique({ where: { id } });
	if (trip?.userId !== userId) throw new ApiError(404, 'Trip not found');
	return trip;
}

export function createTrip(userId: string, input: CreateTripInput) {
	return prisma.trip.create({
		data: {
			name: input.name,
			start: input.date.from,
			end: input.date.to,
			user: { connect: { id: userId } },
		},
	});
}

export async function editTrip(userId: string, id: string, input: EditTripInput) {
	const trip = await requireTrip(userId, id);
	return prisma.trip.update({
		where: { id: trip.id },
		data: { name: input.name, start: input.date.from, end: input.date.to },
	});
}

export async function deleteTrip(userId: string, id: string) {
	const trip = await requireTrip(userId, id);
	await prisma.trip.delete({ where: { id: trip.id } });
	return { ok: true as const };
}

/** Switch a trip between Provisioning / Packing / Auditing mode. */
export async function changeTripMode(
	userId: string,
	id: string,
	mode: TripMode,
) {
	const trip = await requireTrip(userId, id);
	return prisma.trip.update({ where: { id: trip.id }, data: { mode } });
}
