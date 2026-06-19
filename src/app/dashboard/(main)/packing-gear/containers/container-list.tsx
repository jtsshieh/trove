'use client';

import { DragDropProvider, type DragEndEvent } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { LexoRank } from 'lexorank';
import { startTransition, useOptimistic } from 'react';

import type { Container } from '@/generated/prisma/client';

import { EmptyList } from '../../../../../components/empty-list';
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '../../../../../components/ui/card';
import { cn } from '../../../../../lib/utils';
import { editContainer } from './_data/actions';
import {
	DeleteContainerDialog,
	EditContainerDialog,
} from './container-dialogs';

interface UpdatePayload {
	idx: number;
	order: string;
}

export function ContainerList({
	containers,
	sorting,
}: {
	containers: Container[];
	sorting: boolean;
}) {
	const [items, updateOrder] = useOptimistic(
		containers,
		(currentContainers, updatePayload: UpdatePayload) => {
			const newContainers = [...currentContainers];
			newContainers[updatePayload.idx] = {
				...newContainers[updatePayload.idx],
				order: updatePayload.order,
			};
			return newContainers.sort((a, b) => a.order.localeCompare(b.order));
		},
	);

	if (containers.length === 0)
		return (
			<EmptyList
				main="You have no containers"
				sub="You can create one by clicking the Add Container button in the top right corner."
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
			await editContainer(items[oldIndex].id, {
				order: order.toString(),
			});
		});

	return (
		<div className="grid auto-rows-fr grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			<DragDropProvider onDragEnd={handleDragEnd}>
				{items.map((container, index) => (
					<SortableContainer
						container={container}
						index={index}
						key={container.id}
						sorting={sorting}
					/>
				))}
			</DragDropProvider>
		</div>
	);
}

function SortableContainer({
	container,
	index,
	sorting,
}: {
	container: Container;
	index: number;
	sorting: boolean;
}) {
	const { ref, isDragging } = useSortable({
		id: container.id,
		index,
		disabled: !sorting,
	});

	return (
		<ContainerCard
			container={container}
			setNodeRef={sorting ? ref : undefined}
			isDragging={isDragging}
			sorting={sorting}
		/>
	);
}

function ContainerCard({
	container,
	setNodeRef,
	isDragging = false,
	sorting = false,
	overlay = false,
}: {
	container: Container;
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
				<div className="flex flex-col">
					<CardTitle>{container.name}</CardTitle>
					<CardDescription>{container.type}</CardDescription>
				</div>
			</CardHeader>
			<CardFooter className="justify-between">
				<DeleteContainerDialog container={container} disabled={sorting} />
				<EditContainerDialog container={container} disabled={sorting} />
			</CardFooter>
		</Card>
	);
}
