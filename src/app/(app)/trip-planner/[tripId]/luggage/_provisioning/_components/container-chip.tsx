'use client';

import { GripVertical, Package, X } from 'lucide-react';

import { ItemDisplay } from '@/components/ui/item-display';
import { cn } from '@/lib/utils';

import type { LuggageBoard } from '../_data/fetchers';

/** A container provision row as it appears on the suitcases board. */
export type BoardContainer = LuggageBoard['containerProvisions'][number];

/** Number of clothing + essential items provisioned into this container. */
export function containerItemCount(cp: BoardContainer): number {
	return cp.clothingProvisions.length + cp.essentialProvisions.length;
}

/**
 * The single draggable container tile, used both loose in the pool and packed
 * inside a suitcase. `dragRef`/`handleRef` come from the dnd Sortable/DragSource;
 * `onRemove` is only passed when the tile lives inside a suitcase.
 */
export function ContainerChip({
	cp,
	dragRef,
	handleRef,
	isDragging,
	onRemove,
}: {
	cp: BoardContainer;
	dragRef?: (node: HTMLElement | null) => void;
	handleRef?: (node: Element | null) => void;
	isDragging?: boolean;
	onRemove?: () => void;
}) {
	const count = containerItemCount(cp);

	return (
		<div
			ref={dragRef}
			className={cn(
				'group/chip flex items-center gap-1 rounded-lg bg-card p-1.5 ring-1 ring-foreground/10 transition-[box-shadow,transform] duration-[var(--dur-fast)] ease-[var(--ease-out)]',
				'hover-hover:hover:ring-foreground/20',
				isDragging && 'opacity-50',
			)}
		>
			<button
				ref={handleRef}
				type="button"
				aria-label={`Drag ${cp.container.name}`}
				className="text-muted-foreground/60 hover-hover:hover:text-muted-foreground focus-visible:ring-ring -mr-0.5 flex shrink-0 cursor-grab touch-none items-center justify-center rounded-md p-0.5 transition-colors duration-[var(--dur-fast)] outline-none focus-visible:ring-2 active:cursor-grabbing"
			>
				<GripVertical className="size-4" />
			</button>
			<ItemDisplay
				name={cp.container.name}
				imageKey={cp.container.imageKey}
				fallbackIcon={<Package className="size-1/2 opacity-40" />}
				size="panel"
				meta={count === 1 ? '1 item' : `${count} items`}
				className="min-w-0 flex-1"
			/>
			{onRemove && (
				<button
					type="button"
					onClick={onRemove}
					aria-label={`Remove ${cp.container.name} from suitcase`}
					className="text-muted-foreground/60 hover-hover:hover:bg-muted hover-hover:hover:text-foreground focus-visible:ring-ring flex size-6 shrink-0 items-center justify-center rounded-md opacity-0 transition-[color,opacity] duration-[var(--dur-fast)] outline-none group-hover/chip:opacity-100 focus-visible:opacity-100 focus-visible:ring-2"
				>
					<X className="size-4" />
				</button>
			)}
		</div>
	);
}
