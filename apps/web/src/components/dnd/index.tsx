'use client';

import { CollisionPriority } from '@dnd-kit/abstract';
import { pointerIntersection } from '@dnd-kit/collision';
import {
	DragDropProvider,
	useDragDropMonitor,
	useDraggable,
	useDroppable,
	type DragEndEvent,
	type DragOverEvent,
	type DragStartEvent,
} from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { useMemo, useRef, type ReactNode } from 'react';

import {
	encodeZone,
	type AcceptPredicate,
	type ItemData,
	type ItemType,
	type Zone,
	type ZoneData,
} from '@/lib/dnd/zone';

export type { DragEndEvent, DragOverEvent, DragStartEvent };

interface DragHandles {
	ref: (node: HTMLElement | null) => void;
	handleRef: (node: Element | null) => void;
	isDragging: boolean;
	isDropTarget: boolean;
}

/**
 * The whole tile is the drag handle — grabbing anywhere on a card drags it
 * (Trello/Linear style), which is what users expect. Tiles still receive a
 * `handleRef`, but it's a no-op so attaching it to a grip icon is harmless; the
 * grip is purely a visual affordance. Interactive controls inside a tile should
 * `stopPropagation` on pointer-down so they stay clickable.
 */
const NOOP_HANDLE = () => {};

/**
 * A sortable, reorderable item that also acts as a drop target inside its zone.
 * `zone` scopes ordering (one lexorank string per zone); `type` + `accept`
 * gate which item kinds may drop here (e.g. a Clothes container rejects essentials).
 */
export function Sortable({
	id,
	index,
	type,
	zone,
	accept,
	disabled,
	children,
}: {
	id: string;
	index: number;
	type: ItemType;
	zone: Zone;
	accept?: ItemType[] | AcceptPredicate;
	disabled?: boolean;
	children: (handles: DragHandles) => ReactNode;
}) {
	// Stable data identity — dnd-kit compares `data` with Object.is and writes it
	// to a signal on every change, so a fresh object each render storms subscribers
	// with force-updates (the root of the useInsertionEffect/teardown churn).
	const data = useMemo<ItemData>(
		() => ({ role: 'item', type, zone }),
		[type, zone.kind, zone.ownerId],
	);
	// `accept` has the same identity hazard as `data`: callers pass fresh array
	// literals (`accept={['clothing', 'trip-outfit']}`) every render, so we pin a
	// stable reference keyed by content (an array) or by identity (a predicate the
	// caller already memoizes). Without this, cross-zone moves churn.
	const acceptKey = Array.isArray(accept) ? accept.join(',') : '';
	const acceptFn = typeof accept === 'function' ? accept : undefined;
	const acceptValue = useMemo<ItemType | ItemType[] | AcceptPredicate>(
		() => acceptFn ?? accept ?? type,
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[acceptKey, type, acceptFn],
	);
	const { ref, isDragging, isDropTarget } = useSortable({
		id,
		index,
		type,
		accept: acceptValue,
		group: encodeZone(zone),
		data,
		disabled,
		collisionPriority: CollisionPriority.Normal,
		// Resolve drops by what's literally under the pointer. The default detector
		// mis-targets when a zone holds child sortables (dropping onto a NON-empty
		// container/day resolved to the dragged item itself, so nothing moved).
		collisionDetector: pointerIntersection,
	});
	return (
		<>{children({ ref, handleRef: NOOP_HANDLE, isDragging, isDropTarget })}</>
	);
}

/**
 * A zone backdrop droppable. Low collision priority so dnd-kit prefers dropping
 * "between items" (reorder) over the zone fill (append) when items are present.
 */
export function DropZone({
	zone,
	accepts,
	className,
	children,
}: {
	zone: Zone;
	accepts: ItemType[] | AcceptPredicate;
	className?: string;
	children?: ReactNode;
}) {
	const acceptsKey = Array.isArray(accepts) ? accepts.join(',') : '';
	const acceptsFn = typeof accepts === 'function' ? accepts : undefined;
	// Pin a content-stable `accepts` reference: callers pass fresh array literals
	// each render, and dnd-kit compares `accept` by identity (writing it to a
	// signal), so a new array storms subscribers — the useInsertionEffect/teardown
	// churn that breaks cross-zone moves. A predicate is assumed already memoized.
	const acceptsValue = useMemo<ItemType[] | AcceptPredicate>(
		() => accepts,
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[acceptsKey, acceptsFn],
	);
	const data = useMemo<ZoneData>(
		() => ({ role: 'zone', zone, accepts: acceptsValue }),
		[zone.kind, zone.ownerId, acceptsValue],
	);
	const { ref, isDropTarget } = useDroppable({
		id: encodeZone(zone),
		accept: acceptsValue,
		collisionPriority: CollisionPriority.Low,
		collisionDetector: pointerIntersection,
		data,
	});
	return (
		<div ref={ref} data-drop-target={isDropTarget || undefined} className={className}>
			{children}
		</div>
	);
}

/** A pure drag source (e.g. closet-panel pieces) — draggable but not sortable. */
export function DragSource({
	id,
	type,
	zone,
	disabled,
	children,
}: {
	id: string;
	type: ItemType;
	zone: Zone;
	disabled?: boolean;
	children: (handles: Omit<DragHandles, 'isDropTarget'>) => ReactNode;
}) {
	// Stable data identity — dnd-kit compares `data` with Object.is and writes it
	// to a signal on every change, so a fresh object each render storms subscribers
	// with force-updates (the root of the useInsertionEffect/teardown churn).
	const data = useMemo<ItemData>(
		() => ({ role: 'item', type, zone }),
		[type, zone.kind, zone.ownerId],
	);
	const { ref, isDragging } = useDraggable({ id, type, data, disabled });
	return <>{children({ ref, handleRef: NOOP_HANDLE, isDragging })}</>;
}

/**
 * Mirrors order changes to the server on drag-end with an optimistic UI. There is
 * no drag overlay: the dragged element itself moves under the cursor in real time
 * (dnd-kit transforms the source; the controlled board reflows the list live), so
 * every board behaves the same way.
 */
export function DragBoard({
	onDragStart,
	onDragEnd,
	onDragOver,
	children,
}: {
	onDragStart?: (event: DragStartEvent) => void;
	onDragEnd: (event: DragEndEvent) => void;
	onDragOver?: (event: DragOverEvent) => void;
	children: ReactNode;
}) {
	return (
		<DragDropProvider
			onDragStart={onDragStart}
			onDragEnd={onDragEnd}
			onDragOver={onDragOver}
		>
			{children}
		</DragDropProvider>
	);
}

/**
 * Screen-reader live region for drag operations. Render once inside a DragBoard.
 */
export function DragAnnouncer() {
	const ref = useRef<HTMLDivElement>(null);
	useDragDropMonitor({
		onDragStart(event) {
			if (ref.current && event.operation.source) {
				ref.current.textContent = `Picked up ${event.operation.source.id}. Use arrow keys to move, space to drop.`;
			}
		},
		onDragEnd(event) {
			if (!ref.current) return;
			ref.current.textContent = event.canceled
				? 'Movement cancelled.'
				: 'Dropped.';
		},
	});
	return <div ref={ref} aria-live="assertive" role="status" className="sr-only" />;
}
