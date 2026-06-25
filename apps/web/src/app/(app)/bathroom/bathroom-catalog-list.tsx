'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GripVertical, Package } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { BathroomNature } from '@/generated/prisma/enums';

import { DragAnnouncer, DragBoard, DropZone, Sortable } from '@/components/dnd';
import { EmptyList } from '@/components/empty-list';
import { Card } from '@/components/ui/card';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { acceptSameZone } from '@/lib/dnd/accept';
import { rankForNeighbors, sortByRank } from '@/lib/dnd/lexorank';
import { useDragBoard, type SortableDrop } from '@/lib/dnd/use-drag-board';
import { encodeZone, type ItemType, type Zone } from '@/lib/dnd/zone';
import { imageSrc } from '@/lib/images';
import { formatVolume } from '@/lib/units';
import { cn } from '@/lib/utils';

import type {
	BathroomProductWithVariants,
	BathroomVariantWithStock,
} from './_data/api';
import { reorderBathroomProduct } from './_data/api';
import { bathroomKeys, bathroomTypesQueryOptions } from './_data/queries';
import {
	AddBathroomVariantDialog,
	DeleteBathroomProductDialog,
	DeleteBathroomVariantDialog,
	EditBathroomProductDialog,
	EditBathroomVariantDialog,
} from './bathroom-product-dialogs';

// The shared dnd vocabulary (zone.ts) doesn't yet declare a bathroom item/zone, so
// we tag drags with these casts. The orchestrator adds them to the union; the casts
// keep this slice self-contained and the runtime strings stable + unique per nature.
const BATHROOM_ITEM = 'bathroomProduct' as ItemType;

const natureZone = (nature: BathroomNature): Zone => ({
	kind: 'bathroomNature' as Zone['kind'],
	ownerId: nature,
});

interface BathroomCatalogListProps {
	products: BathroomProductWithVariants[];
}

/** One controlled group per nature; array order = display order (lexorank). */
function buildGroups(
	products: BathroomProductWithVariants[],
): Record<string, BathroomProductWithVariants[]> {
	const groups: Record<string, BathroomProductWithVariants[]> = {};
	for (const nature of Object.values(BathroomNature)) {
		groups[encodeZone(natureZone(nature))] = sortByRank(
			products.filter((p) => p.nature === nature),
			(p) => p.order,
		);
	}
	return groups;
}

export function BathroomCatalogList({ products }: BathroomCatalogListProps) {
	const queryClient = useQueryClient();
	const { data: types } = useQuery(bathroomTypesQueryOptions);
	const [typeFilter, setTypeFilter] = useState<string>('all');

	const invalidate = useCallback(
		() => queryClient.invalidateQueries({ queryKey: bathroomKeys.products }),
		[queryClient],
	);

	// Reorder is the only persisted op (cross-nature is blocked by acceptSameZone), so
	// a drop never crosses nature groups. Compute the rank from the product's final
	// neighbours, persist, then re-sync.
	const onSortableDrop = useCallback(
		(drop: SortableDrop<BathroomProductWithVariants>) => {
			if (!drop.sameZone) return;
			const order = rankForNeighbors(drop.destItems, drop.index, (p) => p.order);
			void (async () => {
				try {
					await reorderBathroomProduct(drop.id, order);
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

	const { groups, props } = useDragBoard<BathroomProductWithVariants>({
		groups: () => buildGroups(products),
		deps: [products],
		onSortableDrop,
	});

	const natures = useMemo(() => Object.values(BathroomNature), []);

	if (products.length === 0)
		return (
			<EmptyList
				main="No bathroom products yet"
				sub="Add one with the Add product button in the top right corner."
			/>
		);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-2">
				<Select
					value={typeFilter}
					onValueChange={(value) => setTypeFilter(value ?? 'all')}
				>
					<SelectTrigger className="w-56">
						<SelectValue placeholder="Filter by type" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All types</SelectItem>
						{(types ?? []).map((type) => (
							<SelectItem key={type.id} value={type.name}>
								{type.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<DragBoard {...props}>
				<DragAnnouncer />
				<div className="flex flex-col gap-8">
					{natures.map((nature) => {
						const zone = natureZone(nature);
						const all = groups[encodeZone(zone)] ?? [];
						const items =
							typeFilter === 'all'
								? all
								: all.filter((p) => p.typeName === typeFilter);
						if (items.length === 0) return null;
						return (
							<div key={nature}>
								<h3 className="mb-2 text-xl font-bold">{nature}</h3>
								<DropZone
									zone={zone}
									accepts={acceptSameZone(zone)}
									className="data-[drop-target]:bg-brand-subtle grid grid-cols-1 gap-2 rounded-xl p-1 transition-colors sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
								>
									{items.map((product) => (
										<BathroomProductCard
											key={product.id}
											product={product}
											index={all.indexOf(product)}
											zone={zone}
										/>
									))}
								</DropZone>
							</div>
						);
					})}
				</div>
			</DragBoard>
		</div>
	);
}

function BathroomProductCard({
	product,
	index,
	zone,
}: {
	product: BathroomProductWithVariants;
	index: number;
	zone: Zone;
}) {
	const showVolume = product.nature === 'Consumable';

	return (
		<Sortable
			id={product.id}
			index={index}
			type={BATHROOM_ITEM}
			zone={zone}
			accept={acceptSameZone(zone)}
		>
			{({ ref, handleRef, isDragging, isDropTarget }) => (
				<div
					ref={(node) => {
						ref(node);
						handleRef(node);
					}}
					data-testid="bathroom-product-card"
					data-name={product.name}
					aria-label={`Drag ${product.name}`}
					className="cursor-grab select-none active:cursor-grabbing"
				>
					<Card
						className={cn(
							'group/product relative gap-0 overflow-hidden py-0',
							isDragging && 'opacity-50',
							isDropTarget && 'ring-foreground/20 ring-1',
						)}
					>
						<div className="flex gap-3 p-3">
							<div className="bg-muted text-muted-foreground relative size-20 shrink-0 overflow-hidden rounded-lg">
								{product.imageKey ? (
									// eslint-disable-next-line @next/next/no-img-element
									<img
										src={imageSrc(product.imageKey)}
										alt={product.name}
										loading="lazy"
										className="size-full object-cover"
									/>
								) : (
									<Package className="absolute inset-0 m-auto size-1/3 opacity-40" />
								)}
								<GripVertical className="text-foreground/40 hover-hover:group-hover/product:opacity-100 absolute top-1 left-1 size-4 opacity-0 transition-opacity" />
							</div>
							<div className="flex min-w-0 flex-1 flex-col">
								<p className="font-heading truncate text-sm leading-snug font-medium">
									{product.name}
								</p>
								<p className="text-muted-foreground truncate text-xs">
									{[product.brandName, product.typeName]
										.filter(Boolean)
										.join(' · ') || product.nature}
								</p>
							</div>
						</div>
						{/* Variant management — interactive, so isolate it from the drag source. */}
						<div
							className="border-t"
							onPointerDown={(e) => e.stopPropagation()}
						>
							<ul className="flex flex-col">
								{product.variants.map((variant) => (
									<VariantRow
										key={variant.id}
										product={product}
										variant={variant}
										showVolume={showVolume}
									/>
								))}
							</ul>
							<div className="px-3 py-2">
								<AddBathroomVariantDialog product={product} />
							</div>
						</div>
						<div
							className="bg-muted/40 flex items-center justify-between gap-2 border-t px-3 py-2"
							onPointerDown={(e) => e.stopPropagation()}
						>
							<DeleteBathroomProductDialog product={product} />
							<EditBathroomProductDialog product={product} />
						</div>
					</Card>
				</div>
			)}
		</Sortable>
	);
}

function VariantRow({
	product,
	variant,
	showVolume,
}: {
	product: BathroomProductWithVariants;
	variant: BathroomVariantWithStock;
	showVolume: boolean;
}) {
	const label = variant.label || 'Standard';
	const volume =
		showVolume && variant.capacityMl != null
			? formatVolume(variant.capacityMl, 'Milliliters')
			: null;
	const deletable = product.variants.length > 1;

	return (
		<li className="hover:bg-muted/40 flex items-center justify-between gap-2 px-3 py-1.5 text-xs transition-colors">
			<span className="min-w-0 truncate">
				{label}
				{volume && (
					<span className="text-muted-foreground ml-1 tabular-nums">
						· {volume}
					</span>
				)}
			</span>
			<span className="flex shrink-0 items-center">
				<EditBathroomVariantDialog product={product} variant={variant} />
				{deletable && (
					<DeleteBathroomVariantDialog
						variant={variant}
						label={[product.name, variant.label].filter(Boolean).join(' · ')}
					/>
				)}
			</span>
		</li>
	);
}
