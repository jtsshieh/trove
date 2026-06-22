import { LexoRank } from 'lexorank';

/**
 * Lexorank helpers shared by every drag surface. A single ordered scope (a day,
 * a container, a suitcase, the outfit library) is sorted by one lexorank string;
 * these compute the new rank for a reorder-within-scope or an insert-across-scope.
 */

export function sortByRank<T>(items: T[], getRank: (item: T) => string): T[] {
	return [...items].sort((a, b) => getRank(a).localeCompare(getRank(b)));
}

/** Append after the last item of an ordered list (used by "add" buttons). */
export function rankAfter(lastRank?: string | null): string {
	return lastRank
		? LexoRank.parse(lastRank).genNext().toString()
		: LexoRank.middle().toString();
}

/** Prepend before the first item of an ordered list. */
export function rankBefore(firstRank?: string | null): string {
	return firstRank
		? LexoRank.parse(firstRank).genPrev().toString()
		: LexoRank.middle().toString();
}

/**
 * Reorder within one list: the item at `sourceIndex` is dropped onto the slot of
 * the item at `targetIndex`. `ordered` is the current list (including the source).
 * Mirrors the proven three-case logic used across the app, generalized by getRank.
 */
export function rankForReorder<T>(
	ordered: T[],
	sourceIndex: number,
	targetIndex: number,
	getRank: (item: T) => string,
): string {
	const last = ordered.length - 1;
	if (targetIndex <= 0) {
		return LexoRank.parse(getRank(ordered[0])).genPrev().toString();
	}
	if (targetIndex >= last) {
		return LexoRank.parse(getRank(ordered[last])).genNext().toString();
	}
	const pivot = LexoRank.parse(getRank(ordered[targetIndex]));
	const offset = sourceIndex > targetIndex ? -1 : 1;
	const neighbour = LexoRank.parse(getRank(ordered[targetIndex + offset]));
	return neighbour.between(pivot).toString();
}

/**
 * Compute the rank for an item at `index` of an already-reordered list that
 * INCLUDES the item itself (the controlled-state @dnd-kit pattern: `move()` has
 * placed the item, we just derive a rank between its new neighbours). The
 * neighbours at `index ± 1` are the two items it now sits between; since only the
 * moved item changed position, those neighbours stay in rank order, so a `between`
 * is always valid. Handles head/tail/empty. Replaces the reorder-vs-insert split
 * for boards driven by `move()`.
 */
export function rankForNeighbors<T>(
	ordered: T[],
	index: number,
	getRank: (item: T) => string,
): string {
	const prev = ordered[index - 1];
	const next = ordered[index + 1];
	if (!prev && !next) return LexoRank.middle().toString();
	if (!prev) return LexoRank.parse(getRank(next)).genPrev().toString();
	if (!next) return LexoRank.parse(getRank(prev)).genNext().toString();
	return LexoRank.parse(getRank(prev))
		.between(LexoRank.parse(getRank(next)))
		.toString();
}

/**
 * Insert into a *different* list at position `insertIndex`. `destOrdered` is the
 * destination list (which does NOT contain the moving item). Used for every
 * cross-zone drop (between days/containers/suitcases, closet → day, etc.).
 */
export function rankForInsert<T>(
	destOrdered: T[],
	insertIndex: number,
	getRank: (item: T) => string,
): string {
	const n = destOrdered.length;
	if (n === 0) return LexoRank.middle().toString();
	if (insertIndex <= 0) {
		return LexoRank.parse(getRank(destOrdered[0])).genPrev().toString();
	}
	if (insertIndex >= n) {
		return LexoRank.parse(getRank(destOrdered[n - 1])).genNext().toString();
	}
	const prev = LexoRank.parse(getRank(destOrdered[insertIndex - 1]));
	const next = LexoRank.parse(getRank(destOrdered[insertIndex]));
	return prev.between(next).toString();
}
