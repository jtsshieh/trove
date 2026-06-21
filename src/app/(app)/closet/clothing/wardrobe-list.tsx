'use client';

import { useQueryClient } from '@tanstack/react-query';
import { GripVertical, Shirt } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';

import type { Brand, Clothing, ClothingType } from '@/generated/prisma/client';

import {
	DragAnnouncer,
	DragBoard,
	DropZone,
	Sortable,
} from '@/components/dnd';
import { Card, CardFooter } from '@/components/ui/card';
import { acceptSameZone } from '@/lib/dnd/accept';
import { rankForNeighbors, sortByRank } from '@/lib/dnd/lexorank';
import {
	useDragBoard,
	type SortableDrop,
} from '@/lib/dnd/use-drag-board';
import { encodeZone, type Zone } from '@/lib/dnd/zone';
import { generateClothingName } from '@/lib/generate-clothing-name';
import { imageSrc } from '@/lib/images';
import { cn } from '@/lib/utils';

import { EmptyList } from '@/components/empty-list';
import { DeleteClothingDialog, EditClothingDialog } from './clothing-dialogs';
import { reorderClothing } from './_data/api';
import { wardrobeKeys } from './_data/queries';

interface WardrobeListProps {
	brands: Brand[];
	types: (ClothingType & { clothes: Clothing[] })[];
}

const wardrobeZone = (typeName: string): Zone => ({
	kind: 'wardrobe',
	ownerId: typeName,
});

/** One controlled group per non-empty type; array order = display order. */
function buildGroups(
	types: (ClothingType & { clothes: Clothing[] })[],
): Record<string, Clothing[]> {
	const groups: Record<string, Clothing[]> = {};
	for (const type of types) {
		if (type.clothes.length === 0) continue;
		groups[encodeZone(wardrobeZone(type.name))] = sortByRank(
			type.clothes,
			(c) => c.order,
		);
	}
	return groups;
}

export function WardrobeList({ brands, types }: WardrobeListProps) {
	const queryClient = useQueryClient();
	const invalidateBoard = useCallback(
		() =>
			queryClient.invalidateQueries({
				queryKey: wardrobeKeys.clothingTypes,
			}),
		[queryClient],
	);

	// Reorder is the only persisted op (cross-category is blocked by acceptSameZone,
	// so a drop never crosses type groups). Compute the rank from the piece's final
	// neighbours, persist, then re-sync.
	const onSortableDrop = useCallback(
		(drop: SortableDrop<Clothing>) => {
			if (!drop.sameZone) return;
			const order = rankForNeighbors(drop.destItems, drop.index, (c) => c.order);
			void (async () => {
				try {
					await reorderClothing(drop.id, order);
					toast.success('Reordered');
				} catch {
					toast.error('Could not reorder');
				} finally {
					await invalidateBoard();
				}
			})();
		},
		[invalidateBoard],
	);

	const { groups, props } = useDragBoard<Clothing>({
		groups: () => buildGroups(types),
		deps: [types],
		onSortableDrop,
	});

	const orderedGroups = useMemo(
		() =>
			types
				.filter((t) => t.clothes.length !== 0)
				.map((t) => ({
					name: t.name,
					clothes: groups[encodeZone(wardrobeZone(t.name))] ?? [],
				})),
		[types, groups],
	);

	if (orderedGroups.length === 0)
		return (
			<EmptyList
				main="You have no items in your wardrobe"
				sub="You can create one by clicking the Add Clothing button in the top right corner."
			/>
		);

	return (
		<DragBoard {...props}>
			<DragAnnouncer />
			<div className="flex flex-1 flex-col gap-8">
				{orderedGroups.map((group) => {
					const zone = wardrobeZone(group.name);
					return (
						<div key={group.name}>
							<h3 className="mb-2 text-xl font-bold">{group.name}</h3>
							<DropZone
								zone={zone}
								accepts={acceptSameZone(zone)}
								className="grid grid-cols-2 gap-3 rounded-xl p-1 transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] data-[drop-target]:bg-brand-subtle sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
							>
								{group.clothes.map((clothing, index) => (
									<WardrobeCard
										key={clothing.id}
										clothing={clothing}
										index={index}
										zone={zone}
										brands={brands}
										types={types}
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

function WardrobeCard({
	clothing,
	index,
	zone,
	brands,
	types,
}: {
	clothing: Clothing;
	index: number;
	zone: Zone;
	brands: Brand[];
	types: (ClothingType & { clothes: Clothing[] })[];
}) {
	const stacked = clothing.quantity > 1;
	const name = generateClothingName(clothing);

	return (
		<Sortable
			id={clothing.id}
			index={index}
			type="clothing"
			zone={zone}
			accept={acceptSameZone(zone)}
		>
			{({ ref, handleRef, isDragging, isDropTarget }) => (
				<div
					ref={(node) => {
						ref(node);
						handleRef(node);
					}}
					data-testid="wardrobe-card"
					data-name={name}
					aria-label={`Drag ${name}`}
					className="cursor-grab select-none active:cursor-grabbing"
				>
					<Card
						className={cn(
							'group/wardrobe relative gap-0 py-0',
							// A "stack of identical units" — two thin offset cards behind.
							stacked &&
								'shadow-[3px_3px_0_0_var(--card),3px_3px_0_1px_var(--border),6px_6px_0_0_var(--card),6px_6px_0_1px_var(--border)]',
							isDragging && 'opacity-50',
							isDropTarget && 'ring-1 ring-foreground/20',
						)}
					>
						<div className="bg-muted text-muted-foreground relative aspect-square w-full overflow-hidden">
							{clothing.imageKey ? (
								// eslint-disable-next-line @next/next/no-img-element
								<img
									src={imageSrc(clothing.imageKey)}
									alt={name}
									loading="lazy"
									className="size-full object-cover"
								/>
							) : (
								<Shirt className="absolute inset-0 m-auto size-1/3 opacity-40" />
							)}
							<GripVertical className="text-foreground/40 absolute top-1.5 left-1.5 size-4 opacity-0 transition-opacity hover-hover:group-hover/wardrobe:opacity-100" />
							{stacked && (
								<span
									data-testid="quantity-badge"
									className="bg-brand-subtle text-brand absolute top-1.5 right-1.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums shadow-sm"
								>
									×{clothing.quantity}
								</span>
							)}
						</div>
						<div className="flex flex-1 flex-col gap-2 p-2.5">
							<span className="font-heading text-sm leading-snug font-medium">
								{name}
							</span>
							<CardFooter
								className="mt-auto justify-between gap-2 rounded-none border-t-0 bg-transparent p-0"
								onPointerDown={(e) => e.stopPropagation()}
							>
								<DeleteClothingDialog clothing={clothing} />
								<EditClothingDialog
									clothing={clothing}
									brands={brands}
									types={types}
								/>
							</CardFooter>
						</div>
					</Card>
				</div>
			)}
		</Sortable>
	);
}
