'use client';

import { File, HandSoap, Plug } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { GripVertical } from 'lucide-react';
import { useCallback, type ReactNode } from 'react';
import { toast } from 'sonner';

import type { Essential } from '@/generated/prisma/client';
import { EssentialCategory } from '@/generated/prisma/enums';

import { DragAnnouncer, DragBoard, DropZone, Sortable } from '@/components/dnd';
import { Card, CardFooter } from '@/components/ui/card';
import { acceptSameZone } from '@/lib/dnd/accept';
import { rankForNeighbors, sortByRank } from '@/lib/dnd/lexorank';
import { useDragBoard, type SortableDrop } from '@/lib/dnd/use-drag-board';
import { encodeZone, type Zone } from '@/lib/dnd/zone';
import { imageSrc } from '@/lib/images';
import { cn } from '@/lib/utils';

import { EmptyList } from '@/components/empty-list';
import { reorderEssential } from './_data/api';
import {
	DeleteEssentialDialog,
	EditEssentialDialog,
} from './essential-dialogs';
import { essentialsKeys } from './_data/queries';

const CATEGORY_ICONS: Record<EssentialCategory, ReactNode> = {
	[EssentialCategory.Toiletry]: (
		<HandSoap className="absolute inset-0 m-auto size-1/3 opacity-40" />
	),
	[EssentialCategory.Document]: (
		<File className="absolute inset-0 m-auto size-1/3 opacity-40" />
	),
	[EssentialCategory.Electronic]: (
		<Plug className="absolute inset-0 m-auto size-1/3 opacity-40" />
	),
};

interface EssentialsListProps {
	essentials: Essential[];
}

const categoryZone = (category: EssentialCategory): Zone => ({
	kind: 'essentialCategory',
	ownerId: category,
});

/** One controlled group per category; array order = display order (lexorank). */
function buildGroups(essentials: Essential[]): Record<string, Essential[]> {
	const groups: Record<string, Essential[]> = {};
	for (const category of Object.values(EssentialCategory)) {
		groups[encodeZone(categoryZone(category))] = sortByRank(
			essentials.filter((e) => e.category === category),
			(e) => e.order,
		);
	}
	return groups;
}

export function EssentialsList({ essentials }: EssentialsListProps) {
	const queryClient = useQueryClient();
	const invalidate = useCallback(
		() =>
			queryClient.invalidateQueries({ queryKey: essentialsKeys.essentials }),
		[queryClient],
	);

	// Reorder is the only persisted op (cross-category is blocked by acceptSameZone),
	// so a drop never crosses category groups. Compute the rank from the essential's
	// final neighbours, persist, then re-sync.
	const onSortableDrop = useCallback(
		(drop: SortableDrop<Essential>) => {
			if (!drop.sameZone) return;
			const order = rankForNeighbors(
				drop.destItems,
				drop.index,
				(e) => e.order,
			);
			void (async () => {
				try {
					await reorderEssential(drop.id, order);
					toast.success('Reordered');
				} catch {
					toast.error('Could not reorder');
				} finally {
					await invalidate();
				}
			})();
		},
		[invalidate],
	);

	const { groups, props } = useDragBoard<Essential>({
		groups: () => buildGroups(essentials),
		deps: [essentials],
		onSortableDrop,
	});

	if (essentials.length === 0)
		return (
			<EmptyList
				main="You have no items in your essentials"
				sub="You can create one by clicking the Add Essential button in the top right corner."
			/>
		);

	return (
		<DragBoard {...props}>
			<DragAnnouncer />
			<div className="flex flex-col gap-8">
				{Object.values(EssentialCategory).map((category) => {
					const zone = categoryZone(category);
					const items = groups[encodeZone(zone)] ?? [];
					return (
						<div key={category}>
							<h3 className="mb-2 text-xl font-bold">{category}</h3>
							<DropZone
								zone={zone}
								accepts={acceptSameZone(zone)}
								className="data-[drop-target]:bg-brand-subtle grid grid-cols-2 gap-2 rounded-xl p-1 transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
							>
								{items.map((essential, index) => (
									<EssentialCard
										key={essential.id}
										essential={essential}
										index={index}
										zone={zone}
									/>
								))}
							</DropZone>
						</div>
					);
				})}
			</div>
		</DragBoard>
	);
}

function EssentialCard({
	essential,
	index,
	zone,
}: {
	essential: Essential;
	index: number;
	zone: Zone;
}) {
	const stacked = essential.quantity > 1;

	return (
		<Sortable
			id={essential.id}
			index={index}
			type="essential"
			zone={zone}
			accept={acceptSameZone(zone)}
		>
			{({ ref, handleRef, isDragging, isDropTarget }) => (
				<div
					ref={(node) => {
						ref(node);
						handleRef(node);
					}}
					data-testid="essential-card"
					data-name={essential.name}
					aria-label={`Drag ${essential.name}`}
					className="cursor-grab select-none active:cursor-grabbing"
				>
					<Card
						className={cn(
							'group/essential relative gap-0 py-0',
							isDragging && 'opacity-50',
							isDropTarget && 'ring-1 ring-foreground/20',
						)}
					>
						<div className="bg-muted text-muted-foreground relative aspect-square w-full overflow-hidden">
							{essential.imageKey ? (
								// eslint-disable-next-line @next/next/no-img-element
								<img
									src={imageSrc(essential.imageKey)}
									alt={essential.name}
									loading="lazy"
									className="size-full object-cover"
								/>
							) : (
								CATEGORY_ICONS[essential.category]
							)}
							<GripVertical className="text-foreground/40 hover-hover:group-hover/essential:opacity-100 absolute top-1.5 left-1.5 size-4 opacity-0 transition-opacity" />
							{stacked && (
								<span
									data-testid="quantity-badge"
									className="bg-brand-subtle text-brand absolute top-1.5 right-1.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums shadow-sm"
								>
									×{essential.quantity}
								</span>
							)}
						</div>
						<div className="flex flex-1 flex-col gap-2 p-2.5">
							<div className="flex flex-col">
								<span className="font-heading text-sm leading-snug font-medium">
									{essential.name}
								</span>
								<span className="text-muted-foreground text-xs">
									{essential.category}
								</span>
							</div>
							<CardFooter
								className="mt-auto justify-between gap-2 rounded-none border-t-0 bg-transparent p-0"
								onPointerDown={(e) => e.stopPropagation()}
							>
								<DeleteEssentialDialog essential={essential} />
								<EditEssentialDialog essential={essential} />
							</CardFooter>
						</div>
					</Card>
				</div>
			)}
		</Sortable>
	);
}
