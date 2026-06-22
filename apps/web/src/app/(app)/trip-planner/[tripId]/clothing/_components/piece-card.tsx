'use client';

import { GripVertical, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { Sortable } from '@/components/dnd';
import {
	ItemDisplay,
	type ItemDisplaySize,
} from '@/components/ui/item-display';
import {
	Popover,
	PopoverContent,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { WhereUsedPopover } from '@/components/where-used-popover';
import { generateClothingName } from '@/lib/generate-clothing-name';
import type { Zone } from '@/lib/dnd/zone';
import { cn } from '@/lib/utils';

import { useDeleteClothingProvision } from '../_data/mutations';
import type { BoardProvision } from './types';

/**
 * One draggable clothing piece in a day / outfit / section. Carries its own
 * reuse popover and an inline (modal-free) delete confirm that escalates to a
 * force-delete when the piece is reused elsewhere in the trip.
 */
export function PieceCard({
	tripId,
	provision,
	index,
	zone,
	size = 'calendar-box',
	stackCount = 1,
	reuseCount,
	provisionCount,
	places,
	onRemoved,
}: {
	tripId: string;
	provision: BoardProvision;
	index: number;
	zone: Zone;
	size?: ItemDisplaySize;
	/** Same clothing provisioned N× in this bucket — collapses to one tile, ×N badge. */
	stackCount?: number;
	/** Placements beyond the trip's bringing count — drives the "reused ×N" badge. */
	reuseCount: number;
	/** Total placements of this piece this trip — drives the delete escalation. */
	provisionCount: number;
	places: ReactNode[];
	onRemoved: (id: string) => void;
}) {
	const name = generateClothingName(provision.clothing);
	const stacked = stackCount > 1;
	// The image-forward variants (calendar tiles + Large-mode "card") are a prominent
	// vertical tile with the name beneath, and the controls floated over the photo
	// (revealed on hover) so they never steal width from the name in a narrow cell.
	const imageForward = size === 'calendar-box' || size === 'card';

	return (
		<Sortable
			id={provision.id}
			index={index}
			type="clothing"
			zone={zone}
			accept={['clothing']}
		>
			{({ ref, handleRef, isDragging, isDropTarget }) =>
				imageForward ? (
					// The whole tile is the drag handle (intuitive grab-anywhere).
					// Interactive controls stop the pointer from starting a drag so
					// they stay clickable.
					<div
						ref={(node) => {
							ref(node);
							handleRef(node);
						}}
						data-testid="piece"
						data-name={name}
						data-drop-target={isDropTarget || undefined}
						aria-label={`Drag ${name}`}
						className={cn(
							'group/piece relative cursor-grab rounded-lg bg-card p-1.5 ring-1 ring-foreground/10 transition-[box-shadow,opacity] duration-[var(--dur-fast)] ease-[var(--ease-out)] select-none active:cursor-grabbing hover-hover:hover:ring-foreground/20',
							isDragging && 'opacity-50',
							// Dropping onto an occupied day targets a piece (insert-before) —
							// show the same brand droptarget ring as the empty drop zone.
							isDropTarget && 'bg-brand-subtle',
						)}
					>
						<ItemDisplay
							name={name}
							imageKey={provision.clothing.imageKey}
							size={size}
						/>
						{stacked && (
							<span
								data-testid="stack-badge"
								title={`${stackCount} on this day`}
								className="bg-foreground/85 text-background absolute top-1 left-1 rounded-full px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums shadow-sm"
							>
								×{stackCount}
							</span>
						)}
						<div className="absolute top-1 right-1 flex items-center gap-0.5">
							<span onPointerDown={(e) => e.stopPropagation()}>
								<WhereUsedPopover
									reuseCount={reuseCount}
									placeCount={provisionCount}
									places={places}
								/>
							</span>
							<span onPointerDown={(e) => e.stopPropagation()}>
								<DeletePieceButton
									tripId={tripId}
									provisionId={provision.id}
									name={name}
									provisionCount={provisionCount}
									onRemoved={onRemoved}
									className="bg-card/80 shadow-sm backdrop-blur-sm"
								/>
							</span>
						</div>
					</div>
				) : (
					// The whole card is the drag handle (intuitive grab-anywhere); the
					// grip icon is just an affordance. Interactive controls stop the
					// pointer from starting a drag so they stay clickable.
					<div
						ref={(node) => {
							ref(node);
							handleRef(node);
						}}
						data-testid="piece"
						data-name={name}
						data-drop-target={isDropTarget || undefined}
						aria-label={`Drag ${name}`}
						className={cn(
							'group/piece flex cursor-grab items-center gap-1 rounded-lg bg-card p-1 ring-1 ring-foreground/10 transition-[box-shadow,opacity] duration-[var(--dur-fast)] ease-[var(--ease-out)] select-none active:cursor-grabbing hover-hover:hover:ring-foreground/20',
							isDragging && 'opacity-50',
							isDropTarget && 'bg-brand-subtle',
						)}
					>
						<GripVertical className="text-muted-foreground/30 group-hover/piece:text-muted-foreground/50 -ml-0.5 size-4 shrink-0 transition-colors" />
						<ItemDisplay
							name={name}
							imageKey={provision.clothing.imageKey}
							size={size}
							className="min-w-0 flex-1"
						/>
						{stacked && (
							<span
								data-testid="stack-badge"
								title={`${stackCount} on this day`}
								className="bg-foreground/85 text-background shrink-0 rounded-full px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums"
							>
								×{stackCount}
							</span>
						)}
						<span onPointerDown={(e) => e.stopPropagation()}>
							<WhereUsedPopover
								reuseCount={reuseCount}
								placeCount={provisionCount}
								places={places}
							/>
						</span>
						<span onPointerDown={(e) => e.stopPropagation()}>
							<DeletePieceButton
								tripId={tripId}
								provisionId={provision.id}
								name={name}
								provisionCount={provisionCount}
								onRemoved={onRemoved}
							/>
						</span>
					</div>
				)
			}
		</Sortable>
	);
}

function DeletePieceButton({
	tripId,
	provisionId,
	name,
	provisionCount,
	onRemoved,
	className,
}: {
	tripId: string;
	provisionId: string;
	name: string;
	provisionCount: number;
	onRemoved: (id: string) => void;
	className?: string;
}) {
	const [open, setOpen] = useState(false);
	const deleteProvision = useDeleteClothingProvision(tripId);
	// Multiple placements → removing one just drops this placement; force past the
	// "used N× this trip" warning since it's shown up front.
	const multiplePlacements = provisionCount > 1;

	async function remove() {
		try {
			await deleteProvision.mutateAsync({
				id: provisionId,
				input: { force: multiplePlacements },
			});
			setOpen(false);
			onRemoved(provisionId);
		} catch {
			// onError toast already fired; keep the popover open for a retry.
		}
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						size="icon-xs"
						variant="ghost"
						aria-label={`Remove ${name}`}
						className={cn(
							'text-muted-foreground/50 hover:text-destructive hover-hover:group-hover/piece:opacity-100 shrink-0 opacity-0 focus-visible:opacity-100 aria-expanded:opacity-100',
							className,
						)}
					/>
				}
			>
				<Trash2 />
			</PopoverTrigger>
			<PopoverContent className="w-60" align="end">
				<PopoverHeader>
					<PopoverTitle>Remove this piece?</PopoverTitle>
				</PopoverHeader>
				<p className="text-muted-foreground text-sm">
					{multiplePlacements
						? `${name} is placed ${provisionCount}× this trip. This removes just this one.`
						: `Remove ${name} from this trip.`}
				</p>
				<div className="flex justify-end gap-2">
					<Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button
						size="sm"
						variant="destructive"
						loading={deleteProvision.isPending}
						onClick={remove}
					>
						Remove
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
