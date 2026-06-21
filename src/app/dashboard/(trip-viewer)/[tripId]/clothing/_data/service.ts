import { eachDayOfInterval, startOfDay } from 'date-fns';

import { ApiError } from '@/lib/api/errors';
import {
	requireClothing,
	requireOutfit,
	requireClothingProvision,
	requireTrip,
	requireTripOutfit,
} from '@/lib/api/ownership';
import { prisma } from '@/lib/db.server';
import { rankAfter } from '@/lib/dnd/lexorank';
import { ProvisionSection } from '@/generated/prisma/enums';
import {
	checkPlacement,
	effectiveBringing,
	type BringMap,
	type PlacementLike,
} from '@/lib/reuse';

import type {
	AssignOutfitToDaysInput,
	CreateAdHocTripOutfitInput,
	CreateClothingProvisionsInput,
	MoveClothingProvisionInput,
	MoveTripOutfitToDayInput,
	SetClothingBringingInput,
	UpsertTripDayNoteInput,
} from './schemas';

/**
 * Server-side write logic for the trip clothing board. Ownership is enforced here
 * via the shared API-layer guards (each mutating function takes the caller's
 * `userId` and 404s on a row it doesn't own), replacing the old next-safe-action
 * ownership middleware. No revalidatePath — the client invalidates the board query.
 */

/** A stored provision → the placement shape the reuse rules reason over. */
function toPlacement(p: {
	section: ProvisionSection;
	day: Date | null;
}): PlacementLike {
	return {
		section: p.section,
		dayKey: p.section === ProvisionSection.Day && p.day ? p.day.toISOString() : null,
	};
}

/**
 * Validate that one unit of `clothingId` may be placed at `proposed`, given every
 * other current placement of it in the trip (excluding `excludeProvisionId`).
 * Returns a rejection reason, or null when allowed.
 */
async function validatePlacement(
	tripId: string,
	clothingId: string,
	proposed: PlacementLike,
	excludeProvisionId?: string,
): Promise<string | null> {
	const [clothing, others, bring] = await Promise.all([
		prisma.clothing.findUnique({
			where: { id: clothingId },
			select: { quantity: true },
		}),
		prisma.clothingProvision.findMany({
			where: {
				tripId,
				clothingId,
				...(excludeProvisionId ? { id: { not: excludeProvisionId } } : {}),
			},
			select: { section: true, day: true },
		}),
		prisma.tripClothingBring.findUnique({
			where: { tripId_clothingId: { tripId, clothingId } },
			select: { bringing: true },
		}),
	]);
	if (!clothing) return 'Unknown clothing item';

	const bringMap: BringMap = new Map();
	if (bring) bringMap.set(clothingId, bring.bringing);
	const bringing = effectiveBringing(bringMap, clothingId, clothing.quantity);

	return checkPlacement(
		others.map(toPlacement),
		proposed,
		clothing.quantity,
		bringing,
	);
}

/** Batch-add wardrobe pieces to a day or to the Universal/Backup section. */
export async function createClothingProvisions(
	userId: string,
	tripId: string,
	{ clothingIds, section, day, tripOutfitId }: CreateClothingProvisionsInput,
) {
	await requireTrip(userId, tripId);

	if (section === ProvisionSection.Day && !day) {
		throw new ApiError(400, 'A day is required for the Day section');
	}
	const placementDay = section === ProvisionSection.Day ? day! : null;

	const owned = await prisma.clothing.findMany({
		where: { id: { in: clothingIds }, userId },
		select: { id: true },
	});
	const ownedIds = new Set(owned.map((c) => c.id));
	const ownedRequested = clothingIds.filter((id) => ownedIds.has(id));
	if (ownedRequested.length === 0) throw new ApiError(404, 'Clothing not found');

	// Enforce the exclusivity + capacity rules per piece. Each accepted id
	// reserves one more unit of itself within this same call, so a duplicate
	// id in a batch is validated against the running placement set.
	const proposed: PlacementLike = {
		section,
		dayKey: placementDay ? placementDay.toISOString() : null,
	};
	const valid: string[] = [];
	let firstReason: string | null = null;
	for (const clothingId of ownedRequested) {
		const reason = await validatePlacement(tripId, clothingId, proposed);
		if (reason) {
			firstReason ??= reason;
			continue;
		}
		valid.push(clothingId);
	}

	if (valid.length === 0) {
		return {
			type: 'error' as const,
			message: firstReason ?? 'That placement breaks the packing rules.',
		};
	}

	const last = await prisma.clothingProvision.findFirst({
		where: { tripId, section, day: placementDay, tripOutfitId: tripOutfitId ?? null },
		orderBy: { dayOrder: 'desc' },
		select: { dayOrder: true },
	});

	let rank: string | null = last?.dayOrder ?? null;
	const data = valid.map((clothingId) => {
		rank = rankAfter(rank);
		return {
			tripId,
			clothingId,
			section,
			day: placementDay,
			tripOutfitId: tripOutfitId ?? null,
			dayOrder: rank,
		};
	});
	await prisma.clothingProvision.createMany({ data });

	return {
		type: 'success' as const,
		message: `Added ${valid.length} item${valid.length > 1 ? 's' : ''}`,
	};
}

/**
 * One-click spread: place one piece on as many trip days as it still fits, skipping
 * days it's already on and any day the exclusivity/capacity rules reject. Caps at the
 * effective bringing count (existing loose day-placements count against it).
 */
export async function addClothingToDays(
	userId: string,
	tripId: string,
	clothingId: string,
) {
	const trip = await requireTrip(userId, tripId);
	const clothing = await requireClothing(userId, clothingId);

	// Trip days normalized to local midnight, the same key the board derives.
	const tripDays = eachDayOfInterval({
		start: trip.start,
		end: trip.end,
	}).map((d) => startOfDay(d));

	const bring = await prisma.tripClothingBring.findUnique({
		where: { tripId_clothingId: { tripId, clothingId } },
		select: { bringing: true },
	});
	const bringMap: BringMap = new Map();
	if (bring) bringMap.set(clothingId, bring.bringing);
	const bringing = effectiveBringing(bringMap, clothingId, clothing.quantity);

	// Existing LOOSE day-placements of this piece (outside any outfit).
	const existing = await prisma.clothingProvision.findMany({
		where: { tripId, clothingId, section: ProvisionSection.Day, tripOutfitId: null },
		select: { day: true },
	});
	const existingKeys = new Set(
		existing.map((p) => p.day!.toISOString()),
	);

	// Days it isn't already on, chronological.
	const availableDays = tripDays.filter(
		(d) => !existingKeys.has(d.toISOString()),
	);

	const capacity = Math.max(0, bringing - existingKeys.size);
	const candidates = availableDays.slice(0, capacity);
	if (candidates.length === 0) {
		return {
			type: 'success' as const,
			message: 'Already on every day it can be',
		};
	}

	// Last dayOrder per day-key across ALL loose day-provisions, so each new piece
	// appends after whatever already sits on that day.
	const looseDay = await prisma.clothingProvision.findMany({
		where: { tripId, section: ProvisionSection.Day, tripOutfitId: null },
		select: { day: true, dayOrder: true },
	});
	const lastOrderByKey = new Map<string, string>();
	for (const p of looseDay) {
		if (!p.day) continue;
		const key = p.day.toISOString();
		const current = lastOrderByKey.get(key);
		if (!current || p.dayOrder.localeCompare(current) > 0) {
			lastOrderByKey.set(key, p.dayOrder);
		}
	}

	const data: {
		tripId: string;
		clothingId: string;
		section: ProvisionSection;
		day: Date;
		tripOutfitId: null;
		dayOrder: string;
	}[] = [];
	for (const day of candidates) {
		const key = day.toISOString();
		// Respect the exclusivity rule (e.g. a single-quantity piece already in a section).
		const reason = await validatePlacement(
			tripId,
			clothingId,
			{ section: ProvisionSection.Day, dayKey: key },
			undefined,
		);
		if (reason) continue;
		data.push({
			tripId,
			clothingId,
			section: ProvisionSection.Day,
			day,
			tripOutfitId: null,
			dayOrder: rankAfter(lastOrderByKey.get(key) ?? null),
		});
	}

	if (data.length === 0) {
		return {
			type: 'success' as const,
			message: 'Already on every day it can be',
		};
	}

	await prisma.clothingProvision.createMany({ data });

	const n = data.length;
	return {
		type: 'success' as const,
		message: `Added to ${n} day${n === 1 ? '' : 's'}`,
	};
}

/** The universal cross-day/section/outfit drop: sets placement + rank in one update. */
export async function moveClothingProvision(
	userId: string,
	provisionId: string,
	{ section, day, tripOutfitId, dayOrder }: MoveClothingProvisionInput,
) {
	const clothingProvision = await requireClothingProvision(userId, provisionId);

	const placementDay = section === ProvisionSection.Day ? (day ?? null) : null;
	// Validate the destination against the exclusivity + capacity rules,
	// excluding this provision itself (it's the unit being relocated).
	const reason = await validatePlacement(
		clothingProvision.tripId,
		clothingProvision.clothingId,
		{ section, dayKey: placementDay ? placementDay.toISOString() : null },
		provisionId,
	);
	if (reason) return { type: 'error' as const, message: reason };

	await prisma.clothingProvision.update({
		where: { id: provisionId },
		data: {
			section,
			day: placementDay,
			tripOutfitId: tripOutfitId ?? null,
			dayOrder,
		},
	});

	return { type: 'success' as const, message: 'Moved' };
}

/** Reorder a piece within its current bucket (day/section/outfit). */
export async function changeClothingProvisionDayOrder(
	userId: string,
	provisionId: string,
	newOrder: string,
) {
	await requireClothingProvision(userId, provisionId);

	await prisma.clothingProvision.update({
		where: { id: provisionId },
		data: { dayOrder: newOrder },
	});

	return { type: 'success' as const, message: 'Reordered' };
}

/** Remove a piece from the trip, warning first if it's reused elsewhere. */
export async function deleteClothingProvision(
	userId: string,
	provisionId: string,
	force?: boolean,
) {
	const clothingProvision = await requireClothingProvision(userId, provisionId);

	if (!force) {
		const count = await prisma.clothingProvision.count({
			where: {
				tripId: clothingProvision.tripId,
				clothingId: clothingProvision.clothingId,
			},
		});
		if (count > 1) {
			return {
				type: 'warning' as const,
				message: `This piece is used ${count} times in this trip.`,
				count,
			};
		}
	}

	await prisma.clothingProvision.delete({ where: { id: provisionId } });

	return { type: 'success' as const, message: 'Removed' };
}

/** Set the per-trip "bringing" count for a piece (how many owned units come along). */
export async function setClothingBringing(
	userId: string,
	tripId: string,
	{ clothingId, bringing }: SetClothingBringingInput,
) {
	await requireTrip(userId, tripId);
	await requireClothing(userId, clothingId);

	await prisma.tripClothingBring.upsert({
		where: { tripId_clothingId: { tripId, clothingId } },
		update: { bringing },
		create: { tripId, clothingId, bringing },
	});

	return { type: 'success' as const, message: 'Updated' };
}

/** Upsert a short per-day note (flight, activity, …). Empty note clears it. */
export async function upsertTripDayNote(
	userId: string,
	tripId: string,
	{ day, note }: UpsertTripDayNoteInput,
) {
	await requireTrip(userId, tripId);

	const trimmed = note.trim();
	if (trimmed.length === 0) {
		await prisma.tripDayNote.deleteMany({ where: { tripId, day } });
	} else {
		await prisma.tripDayNote.upsert({
			where: { tripId_day: { tripId, day } },
			update: { note: trimmed },
			create: { tripId, day, note: trimmed },
		});
	}

	return { type: 'success' as const, message: 'Note saved' };
}

/** Materialize a reusable outfit template onto one or more days (snapshot copy). */
export async function assignOutfitToDays(
	userId: string,
	tripId: string,
	{ outfitId, days }: AssignOutfitToDaysInput,
) {
	await requireTrip(userId, tripId);
	await requireOutfit(userId, outfitId);

	const outfit = await prisma.outfit.findUnique({
		where: { id: outfitId },
		include: { items: { orderBy: { order: 'asc' } } },
	});
	if (!outfit) throw new ApiError(404, 'Outfit not found');

	await prisma.$transaction(async (tx) => {
		for (const day of days) {
			const lastOutfit = await tx.tripOutfit.findFirst({
				where: { tripId, day },
				orderBy: { order: 'desc' },
				select: { order: true },
			});
			const tripOutfit = await tx.tripOutfit.create({
				data: {
					tripId,
					day,
					name: outfit.name,
					sourceOutfitId: outfit.id,
					order: rankAfter(lastOutfit?.order ?? null),
				},
			});

			let rank: string | null = null;
			for (const item of outfit.items) {
				rank = rankAfter(rank);
				await tx.clothingProvision.create({
					data: {
						tripId,
						clothingId: item.clothingId,
						section: ProvisionSection.Day,
						day,
						dayOrder: rank,
						tripOutfitId: tripOutfit.id,
					},
				});
			}
		}
	});

	return {
		type: 'success' as const,
		message: `Outfit added to ${days.length} day${days.length > 1 ? 's' : ''}`,
	};
}

/** Create an ad-hoc outfit on a day, optionally grouping existing pieces into it. */
export async function createAdHocTripOutfit(
	userId: string,
	tripId: string,
	{ day, name, clothingProvisionIds }: CreateAdHocTripOutfitInput,
) {
	await requireTrip(userId, tripId);

	const last = await prisma.tripOutfit.findFirst({
		where: { tripId, day },
		orderBy: { order: 'desc' },
		select: { order: true },
	});
	const tripOutfit = await prisma.tripOutfit.create({
		data: {
			tripId,
			day,
			name: name ?? null,
			order: rankAfter(last?.order ?? null),
		},
	});

	if (clothingProvisionIds?.length) {
		await prisma.clothingProvision.updateMany({
			where: { id: { in: clothingProvisionIds }, tripId },
			data: {
				tripOutfitId: tripOutfit.id,
				section: ProvisionSection.Day,
				day,
			},
		});
	}

	return { type: 'success' as const, message: 'Outfit created' };
}

export async function renameTripOutfit(
	userId: string,
	tripOutfitId: string,
	name: string,
) {
	await requireTripOutfit(userId, tripOutfitId);

	await prisma.tripOutfit.update({
		where: { id: tripOutfitId },
		data: { name: name.trim() || null },
	});
	return { type: 'success' as const, message: 'Renamed' };
}

/** Delete an outfit grouping. Its pieces stay on the day (provisions SetNull). */
export async function deleteTripOutfit(userId: string, tripOutfitId: string) {
	await requireTripOutfit(userId, tripOutfitId);

	await prisma.tripOutfit.delete({ where: { id: tripOutfitId } });
	return { type: 'success' as const, message: 'Outfit ungrouped' };
}

/**
 * Relocate a whole TripOutfit (the grouping + every piece in it) to another day.
 * The pieces move with it so the outfit stays intact; their day-rank is preserved.
 */
export async function moveTripOutfitToDay(
	userId: string,
	tripOutfitId: string,
	{ day }: MoveTripOutfitToDayInput,
) {
	const tripOutfit = await requireTripOutfit(userId, tripOutfitId);

	const last = await prisma.tripOutfit.findFirst({
		where: { tripId: tripOutfit.tripId, day },
		orderBy: { order: 'desc' },
		select: { order: true },
	});
	await prisma.$transaction([
		prisma.tripOutfit.update({
			where: { id: tripOutfitId },
			data: { day, order: rankAfter(last?.order ?? null) },
		}),
		prisma.clothingProvision.updateMany({
			where: { tripOutfitId, tripId: tripOutfit.tripId },
			data: { day },
		}),
	]);
	return { type: 'success' as const, message: 'Outfit moved' };
}

/**
 * Snapshot a day's TripOutfit grouping into a reusable Outfit template (a named
 * set of its current clothing), so it can be dropped onto other days/trips later.
 */
export async function saveTripOutfitAsTemplate(
	userId: string,
	tripOutfitId: string,
	name: string,
) {
	await requireTripOutfit(userId, tripOutfitId);

	const provisions = await prisma.clothingProvision.findMany({
		where: { tripOutfitId },
		orderBy: { dayOrder: 'asc' },
		select: { clothingId: true },
	});
	if (provisions.length === 0) {
		return {
			type: 'error' as const,
			message: 'Add pieces to this outfit before saving it.',
		};
	}

	const last = await prisma.outfit.findFirst({
		where: { userId },
		orderBy: { order: 'desc' },
		select: { order: true },
	});

	const uniqueIds = [...new Set(provisions.map((p) => p.clothingId))];
	let rank: string | null = null;
	const items = uniqueIds.map((clothingId) => {
		rank = rankAfter(rank);
		return { clothingId, order: rank };
	});

	await prisma.outfit.create({
		data: {
			name: name.trim(),
			order: rankAfter(last?.order ?? null),
			userId,
			items: { create: items },
		},
	});

	return { type: 'success' as const, message: 'Saved as outfit' };
}
