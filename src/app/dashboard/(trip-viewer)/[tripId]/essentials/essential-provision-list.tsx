'use client';

import { DragDropProvider, type DragEndEvent } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { File, HandSoap, Plug } from '@phosphor-icons/react';
import { LexoRank } from 'lexorank';
import { Menu, TrashIcon } from 'lucide-react';
import { startTransition, useOptimistic, useTransition } from 'react';

import type { Essential, EssentialProvision } from '@/generated/prisma/client';
import { EssentialCategory } from '@/generated/prisma/enums';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import {
	changeEssentialProvisionOrder,
	deleteEssentialProvision,
} from './_data/actions';

const essentialCategories = [
	{
		category: EssentialCategory.Toiletry,
		icon: <HandSoap />,
		name: 'Toiletries',
	},
	{ category: EssentialCategory.Document, icon: <File />, name: 'Documents' },
	{
		category: EssentialCategory.Electronic,
		icon: <Plug />,
		name: 'Electronics',
	},
];
export function EssentialProvisionList({
	groups,
}: {
	groups: Record<
		EssentialCategory,
		(EssentialProvision & { essential: Essential })[]
	>;
}) {
	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
			{essentialCategories.map((categoryData) => (
				<EssentialCategoryCard
					key={categoryData.category}
					meta={categoryData}
					provisions={groups[categoryData.category]}
				/>
			))}
		</div>
	);
}

type UnwrapArray<A> = A extends unknown[] ? UnwrapArray<A[number]> : A;
interface UpdatePayload {
	idx: number;
	order: string;
}

function EssentialCategoryCard({
	meta: { category, icon, name },
	provisions,
}: {
	meta: UnwrapArray<typeof essentialCategories>;
	provisions: (EssentialProvision & { essential: Essential })[];
}) {
	const [items, updateOrder] = useOptimistic(
		provisions,
		(currentProvisions, updatePayload: UpdatePayload) => {
			const newProvisions = [...currentProvisions];
			newProvisions[updatePayload.idx] = {
				...newProvisions[updatePayload.idx],
				order: updatePayload.order,
			};
			return newProvisions.sort((a, b) => a.order.localeCompare(b.order));
		},
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
			await changeEssentialProvisionOrder(items[oldIndex].id, order.toString());
		});

	return (
		<Card key={category}>
			<CardHeader>
				<CardTitle className="flex gap-2">
					{icon} {name}
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col">
				<DragDropProvider onDragEnd={handleDragEnd}>
					{items.map((provision, index) => (
						<SortableEssentialProvision
							key={provision.id}
							provision={provision}
							index={index}
						/>
					))}
				</DragDropProvider>
			</CardContent>
		</Card>
	);
}

function SortableEssentialProvision({
	provision,
	index,
}: {
	provision: EssentialProvision & { essential: Essential };
	index: number;
}) {
	const { ref, handleRef, isDragging } = useSortable({
		id: provision.id,
		index,
	});

	return (
		<EssentialProvisionItem
			provision={provision}
			setNodeRef={ref}
			handleRef={handleRef}
			isDragging={isDragging}
		/>
	);
}

function EssentialProvisionItem({
	provision,
	setNodeRef,
	handleRef,
	isDragging = false,
	overlay = false,
}: {
	provision: EssentialProvision & { essential: Essential };
	setNodeRef?: (node: HTMLElement | null) => void;
	handleRef?: (node: Element | null) => void;
	isDragging?: boolean;
	overlay?: boolean;
}) {
	return (
		<div
			key={provision.id}
			ref={setNodeRef}
			className={cn(
				'flex cursor-default items-center justify-between gap-2 rounded-lg bg-white py-1 select-none',
				isDragging && 'opacity-50',
				overlay && 'shadow-lg',
			)}
		>
			<Menu
				ref={handleRef}
				className="cursor-grab touch-none text-neutral-400"
			/>
			<p className="flex-1 text-base">{provision.essential.name}</p>
			<EssentialProvisionDelete provisionId={provision.id} />
		</div>
	);
}

function EssentialProvisionDelete({ provisionId }: { provisionId: string }) {
	const [isPending, startTransition] = useTransition();
	const onClick = () =>
		startTransition(async () => {
			await deleteEssentialProvision(provisionId);
		});
	return (
		<Button
			size="icon"
			variant="ghost"
			onClick={onClick}
			className="h-8 w-8"
			loading={isPending}
		>
			{!isPending && <TrashIcon size={16} />}
		</Button>
	);
}
