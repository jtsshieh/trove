import { prisma } from '@/lib/db.server';

import { ApiError } from './errors';

/**
 * Shared server-side ownership guards — the API-layer replacement for the old
 * next-safe-action `*Client` middlewares in
 * (trip-viewer)/[tripId]/_data/clients.ts.
 *
 * Each guard loads the entity (with the relation needed to prove ownership) and
 * throws ApiError(404) if it doesn't belong to `userId`, otherwise returns it.
 * Board services call these before mutating, so ownership lives in one place and
 * the per-trip boards can be migrated independently.
 */

const NOT_FOUND = (what: string) => new ApiError(404, `${what} not found`);

/** A user-owned trip. */
export async function requireTrip(userId: string, tripId: string) {
	const trip = await prisma.trip.findUnique({ where: { id: tripId } });
	if (trip?.userId !== userId) throw NOT_FOUND('Trip');
	return trip;
}

/** A user-owned wardrobe piece (catalog). */
export async function requireClothing(userId: string, id: string) {
	const clothing = await prisma.clothing.findUnique({ where: { id } });
	if (clothing?.userId !== userId) throw NOT_FOUND('Clothing');
	return clothing;
}

/** A user-owned container (catalog). */
export async function requireContainer(userId: string, id: string) {
	const container = await prisma.container.findUnique({ where: { id } });
	if (container?.userId !== userId) throw NOT_FOUND('Container');
	return container;
}

/** A user-owned suitcase (catalog). */
export async function requireLuggage(userId: string, id: string) {
	const luggage = await prisma.luggage.findUnique({ where: { id } });
	if (luggage?.userId !== userId) throw NOT_FOUND('Luggage');
	return luggage;
}

/** A user-owned outfit template. */
export async function requireOutfit(userId: string, id: string) {
	const outfit = await prisma.outfit.findUnique({ where: { id } });
	if (outfit?.userId !== userId) throw NOT_FOUND('Outfit');
	return outfit;
}

/** A clothing provision (incl. its trip) on a trip the user owns. */
export async function requireClothingProvision(userId: string, id: string) {
	const provision = await prisma.clothingProvision.findUnique({
		where: { id },
		include: { trip: true },
	});
	if (provision?.trip.userId !== userId) throw NOT_FOUND('Clothing provision');
	return provision;
}

/** An essential provision (incl. its trip) on a trip the user owns. */
export async function requireEssentialProvision(userId: string, id: string) {
	const provision = await prisma.essentialProvision.findUnique({
		where: { id },
		include: { trip: true },
	});
	if (provision?.trip.userId !== userId) throw NOT_FOUND('Essential provision');
	return provision;
}

/** A container provision (incl. its trip) on a trip the user owns. */
export async function requireContainerProvision(userId: string, id: string) {
	const provision = await prisma.containerProvision.findUnique({
		where: { id },
		include: { trip: true },
	});
	if (provision?.trip.userId !== userId) throw NOT_FOUND('Container provision');
	return provision;
}

/** A luggage provision (incl. its trip) on a trip the user owns. */
export async function requireLuggageProvision(userId: string, id: string) {
	const provision = await prisma.luggageProvision.findUnique({
		where: { id },
		include: { trip: true },
	});
	if (provision?.trip.userId !== userId) throw NOT_FOUND('Luggage provision');
	return provision;
}

/** A per-day trip outfit (incl. its trip) on a trip the user owns. */
export async function requireTripOutfit(userId: string, id: string) {
	const tripOutfit = await prisma.tripOutfit.findUnique({
		where: { id },
		include: { trip: true },
	});
	if (tripOutfit?.trip.userId !== userId) throw NOT_FOUND('Trip outfit');
	return tripOutfit;
}

/** A per-trip essential sub-group (incl. its trip) on a trip the user owns. */
export async function requireTripEssentialGroup(userId: string, id: string) {
	const group = await prisma.tripEssentialGroup.findUnique({
		where: { id },
		include: { trip: true },
	});
	if (group?.trip.userId !== userId) throw NOT_FOUND('Trip essential group');
	return group;
}
