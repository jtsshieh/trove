import { cache } from 'react';

import { prisma } from '@/lib/db.server';

import { getCurrentUserSafe } from '@/lib/auth';

export const getAllTrips = cache(async () => {
	const currentUser = await getCurrentUserSafe();

	return prisma.trip.findMany({
		orderBy: { start: 'asc' },
		where: {
			userId: currentUser.id,
		},
	});
});

export const getTrip = cache(async (tripId: string) => {
	const currentUser = await getCurrentUserSafe();

	return prisma.trip.findUnique({
		where: {
			id: tripId,
			userId: currentUser.id,
		},
	});
});

/**
 * A lightweight, picture-forward payload for the trip overview tab: per-area
 * provision counts with packed tallies, plus the day-by-day clothing/essential
 * roster (with thumbnails) so the dashboard can render a day-at-a-glance without
 * pulling the entire board.
 */
export const getTripOverview = cache(async (tripId: string) => {
	const currentUser = await getCurrentUserSafe();

	return prisma.trip.findUnique({
		where: { id: tripId, userId: currentUser.id },
		include: {
			clothingProvisions: {
				orderBy: [{ section: 'asc' }, { day: 'asc' }, { dayOrder: 'asc' }],
				include: { clothing: true },
			},
			essentialProvisions: {
				orderBy: [{ section: 'asc' }, { day: 'asc' }, { dayOrder: 'asc' }],
				include: { essential: { select: { name: true, imageKey: true } } },
			},
			containerProvisions: {
				orderBy: { container: { order: 'asc' } },
				include: {
					container: { select: { name: true, type: true, imageKey: true } },
					clothingProvisions: { select: { packed: true } },
					essentialProvisions: { select: { packed: true } },
				},
			},
			luggageProvisions: {
				orderBy: { luggage: { order: 'asc' } },
				include: {
					luggage: { select: { name: true, imageKey: true } },
					containerProvisions: { select: { packed: true } },
				},
			},
			dayNotes: true,
		},
	});
});

export type TripOverview = NonNullable<
	Awaited<ReturnType<typeof getTripOverview>>
>;

export const getFullTrip = cache(async (tripId: string) => {
	const currentUser = await getCurrentUserSafe();

	return prisma.trip.findUnique({
		where: { id: tripId, userId: currentUser.id },
		include: {
			clothingProvisions: {
				include: {
					clothing: true,
					containerProvision: {
						include: {
							container: true,
							luggageProvision: { include: { luggage: true } },
						},
					},
				},
			},
			essentialProvisions: {
				include: {
					essential: true,
					containerProvision: {
						include: {
							container: true,
							luggageProvision: { include: { luggage: true } },
						},
					},
				},
			},
			containerProvisions: {
				include: {
					container: true,
					luggageProvision: { include: { luggage: true } },

					essentialProvisions: { include: { essential: true } },
					clothingProvisions: { include: { clothing: true } },
				},
			},
			luggageProvisions: {
				include: {
					luggage: true,

					containerProvisions: {
						include: {
							container: true,
							essentialProvisions: { include: { essential: true } },
							clothingProvisions: { include: { clothing: true } },
						},
					},
				},
			},
		},
	});
});
