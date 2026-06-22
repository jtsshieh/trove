import { encodeZone, type AcceptPredicate, type ItemData, type Zone } from './zone';

/**
 * Stable per-zone predicates so dnd-kit only treats SAME-zone items as drop
 * candidates — used by single-category boards (the wardrobe grid) so a piece can't
 * be dragged into another category's group (no cross-category highlight, no
 * live-sort, clean rejection). Cached by encoded zone so the identity is stable
 * across renders (dnd-kit compares `accept` by identity).
 */
const sameZoneCache = new Map<string, AcceptPredicate>();

export function acceptSameZone(zone: Zone): AcceptPredicate {
	const key = encodeZone(zone);
	let predicate = sameZoneCache.get(key);
	if (!predicate) {
		predicate = (source) => {
			const z = (source.data as ItemData | undefined)?.zone;
			return !!z && z.kind === zone.kind && z.ownerId === zone.ownerId;
		};
		sameZoneCache.set(key, predicate);
	}
	return predicate;
}
