'use client';

import { Backpack, GripVertical, X } from 'lucide-react';
import { TShirt } from '@phosphor-icons/react';

import { Sortable } from '@/components/dnd';
import { ItemDisplay } from '@/components/ui/item-display';
import type { ItemType, Zone } from '@/lib/dnd/zone';
import { cn } from '@/lib/utils';

/** A clothing or essential provision, normalized for the board (pool + containers). */
export interface BoardItem {
	id: string;
	type: Extract<ItemType, 'clothing' | 'essential'>;
	name: string;
	imageKey?: string | null;
}

/**
 * The one draggable tile for any provision on the containers board. It is a
 * Sortable (reorder + drop target) inside its zone; the whole tile is the grab
 * handle so dragging from anywhere on it feels direct.
 */
export function ProvisionTile({
	item,
	index,
	zone,
	onRemove,
}: {
	item: BoardItem;
	index: number;
	zone: Zone;
	/** When packed in a container, an explicit unpack-to-pool affordance. */
	onRemove?: () => void;
}) {
	return (
		<Sortable
			id={item.id}
			index={index}
			type={item.type}
			zone={zone}
			accept={[item.type]}
		>
			{({ ref, handleRef, isDragging, isDropTarget }) => (
				<div
					ref={ref}
					data-drop-target={isDropTarget || undefined}
					className={cn(
						'group/tile relative flex items-center gap-1 rounded-lg bg-card p-1.5 pr-2.5 ring-1 ring-foreground/10',
						'transition-shadow duration-[var(--dur-fast)] ease-[var(--ease-out)] hover-hover:hover:ring-foreground/20',
						isDragging && 'opacity-50',
						isDropTarget && 'bg-brand-subtle',
					)}
				>
					<button
						ref={handleRef}
						type="button"
						aria-label={`Drag ${item.name}`}
						className={cn(
							'flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/60 outline-none',
							'transition-colors duration-[var(--dur-fast)] hover-hover:hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing',
						)}
					>
						<GripVertical className="size-4" />
					</button>
					<ItemDisplay
						name={item.name}
						imageKey={item.imageKey}
						size="panel"
						fallbackIcon={
							item.type === 'clothing' ? (
								<TShirt className="size-1/2 opacity-40" />
							) : (
								<Backpack className="size-1/2 opacity-40" />
							)
						}
						className="min-w-0 flex-1"
					/>
					{onRemove && (
						<button
							type="button"
							onPointerDown={(e) => e.stopPropagation()}
							onClick={onRemove}
							aria-label={`Remove ${item.name} from container`}
							className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 opacity-0 transition-[color,opacity] duration-[var(--dur-fast)] outline-none hover-hover:hover:bg-muted hover-hover:hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover/tile:opacity-100"
						>
							<X className="size-4" />
						</button>
					)}
				</div>
			)}
		</Sortable>
	);
}
