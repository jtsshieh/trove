'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Briefcase } from 'lucide-react';
import { useCallback } from 'react';
import { toast } from 'sonner';

import type { Luggage } from '@/generated/prisma/client';

import { DragAnnouncer, DragBoard, DropZone, Sortable } from '@/components/dnd';
import { rankForNeighbors, sortByRank } from '@/lib/dnd/lexorank';
import { useDragBoard, type SortableDrop } from '@/lib/dnd/use-drag-board';
import { encodeZone, type Zone } from '@/lib/dnd/zone';

import { EmptyList } from '../../../../../components/empty-list';
import { Card, CardFooter } from '../../../../../components/ui/card';
import { imageSrc } from '../../../../../lib/images';
import { cn } from '../../../../../lib/utils';
import { reorderLuggage } from './_data/api';
import { luggageKeys } from './_data/queries';
import { DeleteLuggageDialog, EditLuggageDialog } from './luggage-dialogs';

// The luggage library is one self-contained ordered scope; this zone only groups
// the sortables (no cross-zone moves), so a stable synthetic identity is enough.
const LIBRARY_ZONE: Zone = { kind: 'closet', ownerId: 'luggage-library' };

/** One controlled group; array order = display order. */
function buildGroups(luggage: Luggage[]): Record<string, Luggage[]> {
	return {
		[encodeZone(LIBRARY_ZONE)]: sortByRank(luggage, (l) => l.order),
	};
}

export function LuggageList({ luggage }: { luggage: Luggage[] }) {
	const queryClient = useQueryClient();

	// Reorder is the only persisted op (single zone). Compute the rank from the
	// piece's final neighbours, persist, then re-sync.
	const onSortableDrop = useCallback(
		(drop: SortableDrop<Luggage>) => {
			if (!drop.sameZone) return;
			const order = rankForNeighbors(drop.destItems, drop.index, (l) => l.order);
			void (async () => {
				try {
					await reorderLuggage(drop.id, order);
				} catch {
					toast.error('Could not reorder');
				} finally {
					await queryClient.invalidateQueries({ queryKey: luggageKeys.luggage });
				}
			})();
		},
		[queryClient],
	);

	const { groups, props } = useDragBoard<Luggage>({
		groups: () => buildGroups(luggage),
		deps: [luggage],
		onSortableDrop,
	});

	if (luggage.length === 0)
		return (
			<EmptyList
				main="You have no luggage"
				sub="You can create one by clicking the Add Luggage button in the top right corner."
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
				{ordered.map((piece, index) => (
					<Sortable
						key={piece.id}
						id={piece.id}
						index={index}
						type="container"
						zone={LIBRARY_ZONE}
						accept={['container']}
					>
						{({ ref, isDragging }) => (
							<LuggageCard
								luggage={piece}
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

function LuggageCard({
	luggage,
	setNodeRef,
	isDragging = false,
}: {
	luggage: Luggage;
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
				{luggage.imageKey ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={imageSrc(luggage.imageKey)}
						alt={luggage.name}
						loading="lazy"
						className="size-full object-cover"
					/>
				) : (
					<Briefcase className="absolute inset-0 m-auto size-1/3 opacity-40" />
				)}
				{luggage.quantity > 1 && (
					<span
						data-testid="quantity-badge"
						className="bg-brand-subtle text-brand absolute top-1.5 right-1.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums shadow-sm"
					>
						×{luggage.quantity}
					</span>
				)}
			</div>
			<div className="flex flex-1 flex-col gap-2 p-2.5">
				<span className="font-heading text-sm leading-snug font-medium">
					{luggage.name}
				</span>
				<CardFooter className="mt-auto justify-between gap-2 rounded-none border-t-0 bg-transparent p-0">
					<DeleteLuggageDialog luggage={luggage} disabled={false} />
					<EditLuggageDialog luggage={luggage} disabled={false} />
				</CardFooter>
			</div>
		</Card>
	);
}
