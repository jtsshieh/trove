'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Package } from 'lucide-react';
import { useCallback } from 'react';
import { toast } from 'sonner';

import type { Container } from '@/generated/prisma/client';

import { DragAnnouncer, DragBoard, DropZone, Sortable } from '@/components/dnd';
import { rankForNeighbors, sortByRank } from '@/lib/dnd/lexorank';
import { useDragBoard, type SortableDrop } from '@/lib/dnd/use-drag-board';
import { encodeZone, type Zone } from '@/lib/dnd/zone';

import { EmptyList } from '@/components/empty-list';
import { Card, CardFooter } from '@/components/ui/card';
import { imageSrc } from '@/lib/images';
import { cn } from '@/lib/utils';
import { reorderContainer } from './_data/api';
import { containerKeys } from './_data/queries';
import {
	DeleteContainerDialog,
	EditContainerDialog,
} from './container-dialogs';

// The container library is one self-contained ordered scope; this zone only groups
// the sortables (no cross-zone moves), so a stable synthetic identity is enough.
const LIBRARY_ZONE: Zone = { kind: 'closet', ownerId: 'container-library' };

/** One controlled group; array order = display order. */
function buildGroups(containers: Container[]): Record<string, Container[]> {
	return {
		[encodeZone(LIBRARY_ZONE)]: sortByRank(containers, (c) => c.order),
	};
}

export function ContainerList({ containers }: { containers: Container[] }) {
	const queryClient = useQueryClient();

	// Reorder is the only persisted op (single zone). Compute the rank from the
	// container's final neighbours, persist, then re-sync.
	const onSortableDrop = useCallback(
		(drop: SortableDrop<Container>) => {
			if (!drop.sameZone) return;
			const order = rankForNeighbors(drop.destItems, drop.index, (c) => c.order);
			void (async () => {
				try {
					await reorderContainer(drop.id, order);
				} catch {
					toast.error('Could not reorder');
				} finally {
					await queryClient.invalidateQueries({ queryKey: containerKeys.all });
				}
			})();
		},
		[queryClient],
	);

	const { groups, props } = useDragBoard<Container>({
		groups: () => buildGroups(containers),
		deps: [containers],
		onSortableDrop,
	});

	if (containers.length === 0)
		return (
			<EmptyList
				main="You have no containers"
				sub="You can create one by clicking the Add Container button in the top right corner."
			/>
		);

	const ordered = groups[encodeZone(LIBRARY_ZONE)] ?? [];

	return (
		<DragBoard {...props}>
			<DragAnnouncer />
			<DropZone
				zone={LIBRARY_ZONE}
				accepts={['container']}
				className="grid auto-rows-fr grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
			>
				{ordered.map((container, index) => (
					<Sortable
						key={container.id}
						id={container.id}
						index={index}
						type="container"
						zone={LIBRARY_ZONE}
						accept={['container']}
					>
						{({ ref, isDragging }) => (
							<ContainerCard
								container={container}
								setNodeRef={ref}
								isDragging={isDragging}
							/>
						)}
					</Sortable>
				))}
			</DropZone>
		</DragBoard>
	);
}

function ContainerCard({
	container,
	setNodeRef,
	isDragging = false,
}: {
	container: Container;
	setNodeRef?: (node: HTMLElement | null) => void;
	isDragging?: boolean;
}) {
	return (
		<Card
			className={cn(
				'flex h-full flex-col gap-0 py-0 cursor-grab touch-none select-none',
				isDragging && 'opacity-50',
			)}
			ref={setNodeRef}
		>
			<div className="bg-muted text-muted-foreground relative aspect-square w-full overflow-hidden">
				{container.imageKey ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={imageSrc(container.imageKey)}
						alt={container.name}
						loading="lazy"
						className="size-full object-cover"
					/>
				) : (
					<Package className="absolute inset-0 m-auto size-1/3 opacity-40" />
				)}
				{container.quantity > 1 && (
					<span
						data-testid="quantity-badge"
						className="bg-brand-subtle text-brand absolute top-1.5 right-1.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums shadow-sm"
					>
						×{container.quantity}
					</span>
				)}
			</div>
			<div className="flex flex-1 flex-col gap-2 p-2.5">
				<span className="font-heading text-sm leading-snug font-medium">
					{container.name}
				</span>
				<CardFooter className="mt-auto justify-between gap-2 rounded-none border-t-0 bg-transparent p-0">
					<DeleteContainerDialog container={container} disabled={false} />
					<EditContainerDialog container={container} disabled={false} />
				</CardFooter>
			</div>
		</Card>
	);
}
