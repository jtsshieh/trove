'use client';

import { DragDropProvider, type DragEndEvent } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { LexoRank } from 'lexorank';
import { startTransition, useOptimistic } from 'react';

import type { Luggage } from '@/generated/prisma/client';

import { EmptyList } from '../../../../../components/empty-list';
import {
	Card,
	CardFooter,
	CardHeader,
	CardTitle,
} from '../../../../../components/ui/card';
import { cn } from '../../../../../lib/utils';
import { editLuggage } from './_data/actions';
import { DeleteLuggageDialog, EditLuggageDialog } from './luggage-dialogs';

interface UpdatePayload {
	idx: number;
	order: string;
}

export function LuggageList({
	luggage,
	sorting,
}: {
	luggage: Luggage[];
	sorting: boolean;
}) {
	const [items, updateOrder] = useOptimistic(
		luggage,
		(currentLuggage, updatePayload: UpdatePayload) => {
			const newLuggage = [...currentLuggage];
			newLuggage[updatePayload.idx] = {
				...newLuggage[updatePayload.idx],
				order: updatePayload.order,
			};
			return newLuggage.sort((a, b) => a.order.localeCompare(b.order));
		},
	);

	if (luggage.length === 0)
		return (
			<EmptyList
				main="You have no luggage"
				sub="You can create one by clicking the Add Luggage button in the top right corner."
			/>
		);

	const handleDragEnd = (event: DragEndEvent) =>
		startTransition(async () => {
			const { source, target } = event.operation;
			if (event.canceled || !source || !target || source.id === target.id)
				return;

			const oldIndex = items.findIndex((x) => x.id === source.id);
			const newIndex = items.findIndex((x) => x.id === target.id);
			if (oldIndex === -1 || newIndex === -1) return;

			let order;
			if (newIndex === 0) {
				const next = items[newIndex];
				order = LexoRank.parse(next.order).genPrev();
			} else if (newIndex === items.length - 1) {
				const prev = items[newIndex];
				order = LexoRank.parse(prev.order).genNext();
			} else {
				const prev = items[newIndex];
				const offset = oldIndex > newIndex ? -1 : 1;
				const next = items[newIndex + offset];
				order = LexoRank.parse(next.order).between(LexoRank.parse(prev.order));
			}

			updateOrder({ idx: oldIndex, order: order.toString() });
			await editLuggage(items[oldIndex].id, { order: order.toString() });
		});

	return (
		<div className="grid auto-rows-fr grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			<DragDropProvider onDragEnd={handleDragEnd}>
				{items.map((luggage, index) => (
					<SortableLuggage
						luggage={luggage}
						index={index}
						key={luggage.id}
						sorting={sorting}
					/>
				))}
			</DragDropProvider>
		</div>
	);
}

function SortableLuggage({
	luggage,
	index,
	sorting,
}: {
	luggage: Luggage;
	index: number;
	sorting: boolean;
}) {
	const { ref, isDragging } = useSortable({
		id: luggage.id,
		index,
		disabled: !sorting,
	});

	return (
		<LuggageCard
			luggage={luggage}
			setNodeRef={sorting ? ref : undefined}
			isDragging={isDragging}
			sorting={sorting}
		/>
	);
}

function LuggageCard({
	luggage,
	setNodeRef,
	isDragging = false,
	sorting = false,
	overlay = false,
}: {
	luggage: Luggage;
	setNodeRef?: (node: HTMLElement | null) => void;
	isDragging?: boolean;
	sorting?: boolean;
	overlay?: boolean;
}) {
	return (
		<Card
			className={cn(
				'flex h-full flex-col',
				isDragging && 'opacity-50',
				sorting && 'cursor-grab touch-none select-none',
				overlay && 'shadow-2xl',
			)}
			ref={setNodeRef}
		>
			<CardHeader className="flex-1 flex-row justify-between gap-2">
				<CardTitle>{luggage.name}</CardTitle>
			</CardHeader>
			<CardFooter className="justify-between">
				<DeleteLuggageDialog luggage={luggage} disabled={sorting} />
				<EditLuggageDialog luggage={luggage} disabled={sorting} />
			</CardFooter>
		</Card>
	);
}
