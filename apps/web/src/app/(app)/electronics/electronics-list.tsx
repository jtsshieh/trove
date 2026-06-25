'use client';

import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
	Cable,
	Cpu,
	GripVertical,
	BatteryCharging,
	Plug,
	Link2,
} from 'lucide-react';
import { useCallback, type ReactNode } from 'react';
import { toast } from 'sonner';

import { ElectronicKind } from '@/generated/prisma/enums';

import { DragAnnouncer, DragBoard, DropZone, Sortable } from '@/components/dnd';
import { EmptyList } from '@/components/empty-list';
import { Card, CardFooter } from '@/components/ui/card';
import { acceptSameZone } from '@/lib/dnd/accept';
import { rankForNeighbors, sortByRank } from '@/lib/dnd/lexorank';
import { useDragBoard, type SortableDrop } from '@/lib/dnd/use-drag-board';
import { encodeZone, type Zone } from '@/lib/dnd/zone';
import { imageSrc } from '@/lib/images';
import { cn } from '@/lib/utils';

import type { ElectronicWithLinks } from './_data/api';
import { reorderElectronic } from './_data/api';
import { electronicsKeys } from './_data/queries';
import {
	DeleteElectronicDialog,
	EditElectronicDialog,
} from './electronic-dialogs';

const KIND_LABELS: Record<ElectronicKind, string> = {
	[ElectronicKind.Device]: 'Devices',
	[ElectronicKind.Cable]: 'Cables',
	[ElectronicKind.PowerBank]: 'Power Banks',
	[ElectronicKind.Accessory]: 'Accessories',
};

const KIND_ICONS: Record<ElectronicKind, ReactNode> = {
	[ElectronicKind.Device]: (
		<Cpu className="absolute inset-0 m-auto size-1/3 opacity-40" />
	),
	[ElectronicKind.Cable]: (
		<Cable className="absolute inset-0 m-auto size-1/3 opacity-40" />
	),
	[ElectronicKind.PowerBank]: (
		<BatteryCharging className="absolute inset-0 m-auto size-1/3 opacity-40" />
	),
	[ElectronicKind.Accessory]: (
		<Plug className="absolute inset-0 m-auto size-1/3 opacity-40" />
	),
};

interface ElectronicsListProps {
	electronics: ElectronicWithLinks[];
}

// One zone per kind. `kind: 'electronic'` needs adding to ZoneKind in
// src/lib/dnd/zone.ts (a shared file the orchestrator owns); cast at this single
// boundary so the slice type-checks until that literal lands.
const kindZone = (kind: ElectronicKind): Zone => ({
	kind: 'electronic' as Zone['kind'],
	ownerId: kind,
});

/** One controlled group per kind; array order = display order (lexorank). */
function buildGroups(
	electronics: ElectronicWithLinks[],
): Record<string, ElectronicWithLinks[]> {
	const groups: Record<string, ElectronicWithLinks[]> = {};
	for (const kind of Object.values(ElectronicKind)) {
		groups[encodeZone(kindZone(kind))] = sortByRank(
			electronics.filter((e) => e.kind === kind),
			(e) => e.order,
		);
	}
	return groups;
}

/** The accessories/devices this item is associated with, as display names. */
function linkedNames(electronic: ElectronicWithLinks): string[] {
	return [
		...electronic.asDevice.map((l) => l.accessory.name),
		...electronic.asAccessory.map((l) => l.device.name),
	];
}

export function ElectronicsList({ electronics }: ElectronicsListProps) {
	const queryClient = useQueryClient();
	const invalidate = useCallback(
		() =>
			queryClient.invalidateQueries({
				queryKey: electronicsKeys.electronics,
			}),
		[queryClient],
	);

	// Reorder is the only persisted op (cross-kind is blocked by acceptSameZone),
	// so a drop never crosses kind groups. Compute the rank from the item's final
	// neighbours, persist, then re-sync.
	const onSortableDrop = useCallback(
		(drop: SortableDrop<ElectronicWithLinks>) => {
			if (!drop.sameZone) return;
			const order = rankForNeighbors(drop.destItems, drop.index, (e) => e.order);
			void (async () => {
				try {
					await reorderElectronic(drop.id, order);
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

	const { groups, props } = useDragBoard<ElectronicWithLinks>({
		groups: () => buildGroups(electronics),
		deps: [electronics],
		onSortableDrop,
	});

	if (electronics.length === 0)
		return (
			<EmptyList
				main="You have no electronics"
				sub="You can add one by clicking the Add Electronic button in the top right corner."
			/>
		);

	return (
		<DragBoard {...props}>
			<DragAnnouncer />
			<div className="flex flex-col gap-8">
				{Object.values(ElectronicKind).map((kind) => {
					const zone = kindZone(kind);
					const items = groups[encodeZone(zone)] ?? [];
					if (items.length === 0) return null;
					return (
						<div key={kind}>
							<h3 className="mb-2 text-xl font-bold">{KIND_LABELS[kind]}</h3>
							<DropZone
								zone={zone}
								accepts={acceptSameZone(zone)}
								className="data-[drop-target]:bg-brand-subtle grid grid-cols-2 gap-2 rounded-xl p-1 transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
							>
								{items.map((electronic, index) => (
									<ElectronicCard
										key={electronic.id}
										electronic={electronic}
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

function ElectronicCard({
	electronic,
	index,
	zone,
}: {
	electronic: ElectronicWithLinks;
	index: number;
	zone: Zone;
}) {
	const stacked = electronic.quantity > 1;
	const links = linkedNames(electronic);

	return (
		<Sortable
			id={electronic.id}
			index={index}
			// `type: 'electronic'` needs adding to ItemType in src/lib/dnd/zone.ts; cast
			// at this single boundary so the slice type-checks until that literal lands.
			type={'electronic' as Parameters<typeof Sortable>[0]['type']}
			zone={zone}
			accept={acceptSameZone(zone)}
		>
			{({ ref, handleRef, isDragging, isDropTarget }) => (
				<div
					ref={(node) => {
						ref(node);
						handleRef(node);
					}}
					data-testid="electronic-card"
					data-name={electronic.name}
					aria-label={`Drag ${electronic.name}`}
					className="cursor-grab select-none active:cursor-grabbing"
				>
					<Card
						className={cn(
							'group/electronic relative gap-0 py-0',
							isDragging && 'opacity-50',
							isDropTarget && 'ring-1 ring-foreground/20',
						)}
					>
						<div className="bg-muted text-muted-foreground relative aspect-square w-full overflow-hidden">
							{electronic.imageKey ? (
								// eslint-disable-next-line @next/next/no-img-element
								<img
									src={imageSrc(electronic.imageKey)}
									alt={electronic.name}
									loading="lazy"
									className="size-full object-cover"
								/>
							) : (
								KIND_ICONS[electronic.kind]
							)}
							<GripVertical className="text-foreground/40 hover-hover:group-hover/electronic:opacity-100 absolute top-1.5 left-1.5 size-4 opacity-0 transition-opacity" />
							{stacked && (
								<span
									data-testid="quantity-badge"
									className="bg-brand-subtle text-brand absolute top-1.5 right-1.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums shadow-sm"
								>
									×{electronic.quantity}
								</span>
							)}
						</div>
						<div className="flex flex-1 flex-col gap-2 p-2.5">
							<div className="flex flex-col">
								<span className="font-heading text-sm leading-snug font-medium">
									{electronic.name}
								</span>
								<span className="text-muted-foreground text-xs">
									{[electronic.brandName, electronic.model]
										.filter(Boolean)
										.join(' · ') || electronic.kind}
								</span>
								{electronic.acquiredAt && (
									<span className="text-muted-foreground text-xs">
										Acquired {format(electronic.acquiredAt, 'LLL dd, y')}
									</span>
								)}
							</div>
							{links.length > 0 && (
								<div className="flex flex-wrap gap-1">
									{links.map((name) => (
										<span
											key={name}
											className="bg-brand-subtle text-brand inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
										>
											<Link2 className="size-3" />
											{name}
										</span>
									))}
								</div>
							)}
							<CardFooter
								className="mt-auto justify-between gap-2 rounded-none border-t-0 bg-transparent p-0"
								onPointerDown={(e) => e.stopPropagation()}
							>
								<DeleteElectronicDialog electronic={electronic} />
								<EditElectronicDialog electronic={electronic} />
							</CardFooter>
						</div>
					</Card>
				</div>
			)}
		</Sortable>
	);
}
