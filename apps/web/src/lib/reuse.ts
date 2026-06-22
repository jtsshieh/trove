/**
 * Reuse is derived, not stored. Each (trip, clothing) has an effective "bringing"
 * count — how many of the owned units are coming on this trip (a TripClothingBring
 * row if set, else the full owned quantity). A piece is "reused" only when its
 * distinct-unit usage EXCEEDS what's being brought.
 *
 * Exclusivity rules shape that math:
 *  - A physical unit lives in exactly one section: a day, Universal, or Backup.
 *  - Reuse (sharing one unit across placements) is allowed ONLY across days — the
 *    same unit re-worn on different days. So the day section consumes only the MAX
 *    number of that clothing placed on any single day.
 *  - Universal and Backup never share a unit with a day or each other: each of
 *    their placements consumes its own distinct unit.
 *  => distinct units = maxOnAnyDay + universalCount + backupCount.
 *
 * These pure helpers drive the "reused ×N" badge, the where-used popover, and the
 * closet's "N left" indicator from the board data already loaded.
 */

/** Per-clothing effective bringing (override if present, else owned quantity). */
export type BringMap = Map<string, number>;

/** The placement fields a unit-usage calculation needs from each provision. */
export interface PlacementLike {
	section: 'Day' | 'Universal' | 'Backup';
	/** Local-midnight ISO day key for Day placements; null otherwise. */
	dayKey: string | null;
}

/**
 * Distinct physical units a clothing's placements consume, honoring the day-reuse
 * rule: the max placed on any single day (units shared across days) plus every
 * Universal and Backup placement (each its own unit).
 */
export function distinctUnits(placements: PlacementLike[]): number {
	const perDay = new Map<string, number>();
	let universal = 0;
	let backup = 0;
	for (const p of placements) {
		if (p.section === 'Universal') universal += 1;
		else if (p.section === 'Backup') backup += 1;
		else if (p.dayKey) perDay.set(p.dayKey, (perDay.get(p.dayKey) ?? 0) + 1);
	}
	let maxOnAnyDay = 0;
	for (const n of perDay.values()) if (n > maxOnAnyDay) maxOnAnyDay = n;
	return maxOnAnyDay + universal + backup;
}

/** How many placements each clothing has within the trip. */
export function reuseCounts(
	provisions: { clothingId: string }[],
): Map<string, number> {
	const counts = new Map<string, number>();
	for (const provision of provisions) {
		counts.set(
			provision.clothingId,
			(counts.get(provision.clothingId) ?? 0) + 1,
		);
	}
	return counts;
}

/** Resolve the effective bringing for a clothing item (override or owned qty). */
export function effectiveBringing(
	bringing: BringMap,
	clothingId: string,
	ownedQuantity: number,
): number {
	return bringing.get(clothingId) ?? ownedQuantity;
}

/**
 * The reuse badge value: placements beyond the bringing count. 0 (no badge) when a
 * piece is placed no more times than it's brought.
 */
export function reuseCount(provisionCount: number, bringing: number): number {
	return Math.max(0, provisionCount - bringing);
}

/** Whether a clothing item is reused: placed more times than it's brought. */
export function isReused(provisionCount: number, bringing: number): boolean {
	return provisionCount > bringing;
}

/** Units still free to place before reuse kicks in (clamped ≥ 0). */
export function remaining(provisionCount: number, bringing: number): number {
	return Math.max(0, bringing - provisionCount);
}

/**
 * Validate a proposed placement of one clothing unit against the exclusivity +
 * capacity rules. `others` is every CURRENT placement of the same clothing EXCEPT
 * the one being created/moved; `proposed` is where it's headed. Returns a rejection
 * reason, or null when the placement is allowed.
 *
 *  - Reuse across DAYS is fine even for a one-of piece (one unit shared); Universal
 *    and Backup each take their own unit, so a single-quantity piece still can't sit
 *    in two sections at once (that needs two units) — enforced purely by the
 *    distinct-unit math below, NOT a blanket "one placement only" gate (which also
 *    wrongly blocked MOVING a piece that's already reused).
 *  - Resulting distinct units may not exceed the bringing count, unless the piece
 *    was already over-allocated (a lowered bringing) and this doesn't add a unit.
 */
export function checkPlacement(
	others: PlacementLike[],
	proposed: PlacementLike,
	quantity: number,
	bringing: number,
): string | null {
	const before = distinctUnits(others);
	const after = distinctUnits([...others, proposed]);
	// Block only when this placement pushes distinct-unit usage past capacity. An
	// existing over-allocation (from lowering "bringing") isn't grown here, so reorders
	// and same-unit day-reuse (incl. relocating a reused piece) stay allowed.
	if (after > bringing && after > before) {
		return bringing <= 1
			? 'You only have one of this. It can go on several days as one shared unit, but not in two places at once. Remove the other placement first.'
			: `You're bringing ${bringing} of this and they're all placed. Raise the bring count to add more.`;
	}
	return null;
}

/** Every provision of the same clothing item, for the where-used popover. */
export function whereUsed<T extends { id: string; clothingId: string }>(
	provisions: T[],
	clothingId: string,
): T[] {
	return provisions.filter((provision) => provision.clothingId === clothingId);
}
