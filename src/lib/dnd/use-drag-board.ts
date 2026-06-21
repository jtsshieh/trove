'use client';

import { move } from '@dnd-kit/helpers';
import {
	type DragEndEvent,
	type DragOverEvent,
	type DragStartEvent,
} from '@dnd-kit/react';
import { isSortable } from '@dnd-kit/react/sortable';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
	decodeZone,
	encodeZone,
	isItemData,
	isZoneData,
	type ItemType,
	type Zone,
} from './zone';

/**
 * The official @dnd-kit/react controlled-state board, distilled into one hook so
 * every drag board shares it.
 *
 * The model (per the dnd-kit "Multiple sortable lists" + "Connect to state"
 * guides): the board renders from a LOCAL `Record<encodedZone, Item[]>` whose array
 * order IS the display order. During a drag we keep it in lockstep with dnd-kit via
 * `move()` in `onDragOver`; on drop we hand the board the final placement so it can
 * persist (lexorank + API). Server data only re-seeds the local state when NO drag
 * is in progress — syncing mid-drag is what threw `removeChild` / "useInsertionEffect
 * must not schedule updates" (a refetch swapping the array out from under dnd-kit's
 * optimistically-moved DOM). No overlay, no microtask/rAF, no drop-animation trick —
 * the controlled state always matches the DOM, so React never fights the reconciler.
 *
 * Record keys MUST equal `encodeZone(zone)` (what `Sortable`/`DropZone` pass as
 * their dnd-kit `group`/`id`), so `move()` can resolve source/target groups.
 */

type GroupRecord<T> = Record<string, T[]>;

/** An in-board sortable move: the item now lives in a controlled group. */
export interface SortableDrop<T> {
	id: string;
	type: ItemType;
	fromZone: Zone;
	toZone: Zone;
	/** The destination group AFTER the move (final order, includes the moved item). */
	destItems: T[];
	/** The moved item's final index within `destItems`. */
	index: number;
	sameZone: boolean;
}

/**
 * A drop whose source is NOT a controlled-group item — a pure drag source (e.g. a
 * closet piece or outfit template) or a sortable dropped onto a non-group droppable.
 * The board decides what it means (create / materialize / reject).
 */
export interface ExternalDrop {
	id: string;
	type: ItemType;
	fromZone: Zone;
	/** The zone dropped onto (a controlled group or any droppable), if resolvable. */
	toZone: Zone | null;
	/** The sortable item dropped onto, if any (for insert positioning). */
	targetId: string | null;
}

export function useDragBoard<T extends { id: string }>(opts: {
	/** Derive the controlled groups from the server board (called when idle). */
	groups: () => GroupRecord<T>;
	/**
	 * Re-seed dependency LIST (used as the effect's deps): re-derives the groups
	 * when any entry changes (and no drag is in progress). Pass EVERY server slice the
	 * groups read — e.g. `[board]`, or `[provisions, subGroups]` — because TanStack's
	 * structural sharing can keep one slice's reference stable while another changes.
	 */
	deps: unknown[];
	onSortableDrop?: (drop: SortableDrop<T>, event: DragEndEvent) => void;
	onExternalDrop?: (drop: ExternalDrop, event: DragEndEvent) => void;
}) {
	const { groups: derive, deps, onSortableDrop, onExternalDrop } = opts;

	const [groups, setGroups] = useState<GroupRecord<T>>(derive);
	// Synchronous mirror for reads inside event handlers (state is stale in a
	// closure); flags + snapshots so we never re-seed mid-drag and can cancel.
	const ref = useRef(groups);
	const dragging = useRef(false);
	const snapshot = useRef(groups);
	// The dragged item's ORIGIN group key, captured at drag start. `move()` in
	// onDragOver remounts the item into its destination subtree mid-drag, which makes
	// dnd-kit's own `initialGroup` (and the item's render zone) report the
	// destination — so we record the origin ourselves, before any move has fired.
	const originKey = useRef<string | null>(null);

	useEffect(() => {
		if (dragging.current) return;
		const next = derive();
		ref.current = next;
		setGroups(next);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps);

	/** Apply a local update (drag move, optimistic button action) + keep ref synced.
	 * The ref is updated SYNCHRONOUSLY (not just inside the setState updater) so a
	 * rapid onDragOver→onDragEnd sequence reads the latest groups, not a stale copy. */
	const write = useCallback((updater: (g: GroupRecord<T>) => GroupRecord<T>) => {
		const next = updater(ref.current);
		ref.current = next;
		setGroups(next);
	}, []);

	const onDragStart = useCallback((event: DragStartEvent) => {
		dragging.current = true;
		snapshot.current = ref.current;
		const src = event.operation.source;
		// At drag start the item still sits in its origin group (no move yet).
		originKey.current =
			src && isSortable(src) && src.group != null
				? String(src.group)
				: src && isItemData(src.data)
					? encodeZone(src.data.zone)
					: null;
	}, []);

	const onDragOver = useCallback(
		(event: DragOverEvent) => {
			// `move` reorders within/between controlled groups; it safely no-ops (and
			// preventDefaults) for sources that aren't in the record. Zone `accept`
			// gating means a rejected target is never hovered, so no guard needed.
			write((g) => move(g, event) as GroupRecord<T>);
		},
		[write],
	);

	const onDragEnd = useCallback(
		(event: DragEndEvent) => {
			dragging.current = false;
			if (event.canceled) {
				write(() => snapshot.current);
				return;
			}

			const { source, target } = event.operation;
			if (!source) return;
			const data = source.data;
			if (!isItemData(data)) return;
			const id = String(source.id);

			// Did the item land in a controlled group? If so, `move()` already placed
			// it — read its final group + index straight from the live record.
			let toKey: string | undefined;
			for (const [k, arr] of Object.entries(ref.current)) {
				if (arr.some((it) => it.id === id)) {
					toKey = k;
					break;
				}
			}

			if (toKey) {
				// Fallback: `move()` can fail to relocate the item into a small EMPTY
				// droppable when a short drag oscillates, leaving it in its origin group.
				// If the user actually RELEASED over a different controlled zone's
				// droppable, honor that (combining move's live reorder with resolve-at-drop).
				const tdata = target?.data;
				if (isZoneData(tdata)) {
					const targetKey = encodeZone(tdata.zone);
					const moved =
						targetKey !== toKey && ref.current[targetKey] !== undefined
							? (ref.current[toKey] ?? []).find((it) => it.id === id)
							: undefined;
					if (moved) {
						const prev = ref.current;
						const fromArr = (prev[toKey] ?? []).filter((it) => it.id !== id);
						const toArr = [...(prev[targetKey] ?? []), moved];
						const next = { ...prev, [toKey]: fromArr, [targetKey]: toArr };
						ref.current = next;
						setGroups(next);
						onSortableDrop?.(
							{
								id,
								type: data.type,
								fromZone: decodeZone(originKey.current ?? toKey),
								toZone: tdata.zone,
								destItems: toArr,
								index: toArr.length - 1,
								sameZone: false,
							},
							event,
						);
						return;
					}
				}

				const destItems = ref.current[toKey];
				const index = destItems.findIndex((it) => it.id === id);
				// Origin captured at drag start — `data.zone` and dnd-kit's `initialGroup`
				// both report the post-move destination here.
				const fromKey = originKey.current ?? toKey;
				onSortableDrop?.(
					{
						id,
						type: data.type,
						fromZone: decodeZone(fromKey),
						toZone: decodeZone(toKey),
						destItems,
						index: index === -1 ? destItems.length - 1 : index,
						sameZone: fromKey === toKey,
					},
					event,
				);
				return;
			}

			// External source / non-group drop: resolve the target zone from the drop.
			const tdata = target?.data;
			const toZone = isZoneData(tdata)
				? tdata.zone
				: isItemData(tdata)
					? tdata.zone
					: null;
			const targetId = target && isItemData(tdata) ? String(target.id) : null;
			onExternalDrop?.(
				{ id, type: data.type, fromZone: data.zone, toZone, targetId },
				event,
			);
		},
		[write, onSortableDrop, onExternalDrop],
	);

	return {
		groups,
		write,
		dragging,
		props: { onDragStart, onDragOver, onDragEnd },
	};
}
