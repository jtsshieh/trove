'use client';

import { DragDropProvider, type DragEndEvent } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { LexoRank } from 'lexorank';
import { Menu } from 'lucide-react';
import { startTransition, useOptimistic } from 'react';

import type {
	Clothing,
	ClothingProvision,
	Container,
	ContainerProvision,
	Essential,
	EssentialProvision,
} from '@/generated/prisma/client';
import { ContainerType } from '@/generated/prisma/enums';

import { EmptyList } from '../../../../../../components/empty-list';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '../../../../../../components/ui/card';
import { generateClothingName } from '../../../../../../lib/generate-clothing-name';
import { cn } from '../../../../../../lib/utils';
import {
	changeClothingProvisionContainerOrder,
	changeEssentialProvisionContainerOrder,
} from './_data/actions';
import { getTripWithContainerProvisions } from './_data/fetchers';
import {
	AddToContainerClothingDialog,
	AddToContainerEssentialDialog,
} from './add-to-container-dialog';
import { DeleteContainerProvisionDialog } from './container-provision-dialogs';
import {
	DeleteFromContainerClothing,
	DeleteFromContainerEssential,
} from './delete-from-container-dialog';

interface ContainerProvisionListProps {
	trip: NonNullable<Awaited<ReturnType<typeof getTripWithContainerProvisions>>>;
}

interface UpdatePayload {
	containerProvisionId: string;
	idx: number;
	order: string;
}

type OptimisticUpdate = (payload: UpdatePayload) => void;

export function ContainerProvisionList({ trip }: ContainerProvisionListProps) {
	const [containerProvisions, updateOrder] = useOptimistic(
		trip.containerProvisions,
		(currentContainerProvisions, updatePayload: UpdatePayload) => {
			const newContainerProvisions = [...currentContainerProvisions];
			const containerProvisionIdx = newContainerProvisions.findIndex(
				(p) => p.id === updatePayload.containerProvisionId,
			);

			if (containerProvisionIdx === -1) return newContainerProvisions;

			const currentContainerProvision =
				newContainerProvisions[containerProvisionIdx];

			const propName =
				currentContainerProvision.container.type === ContainerType.Clothes
					? 'clothingProvisions'
					: 'essentialProvisions';

			newContainerProvisions[containerProvisionIdx] = {
				...newContainerProvisions[containerProvisionIdx],
				[propName]: [...currentContainerProvision[propName]],
			};

			const newContainerProvision =
				newContainerProvisions[containerProvisionIdx];

			newContainerProvision[propName][updatePayload.idx] = {
				...newContainerProvision[propName][updatePayload.idx],
				containerOrder: updatePayload.order,
			};

			newContainerProvision[propName].sort((a, b) =>
				a.containerOrder!.localeCompare(b.containerOrder!),
			);

			return newContainerProvisions;
		},
	);

	if (trip.containerProvisions.length === 0) {
		return (
			<EmptyList
				main="You have not added any containers to this trip"
				sub="You can start assigning your provisioned items as soon as you add a container."
			/>
		);
	}

	const unusedClothingProvisions = trip.clothingProvisions.filter((a) => {
		const isUnused = !trip.containerProvisions.some((b) =>
			b.clothingProvisions.some((c) => a.id === c.id),
		);

		if (!isUnused) return false;

		const reused = trip.clothingProvisions.filter(
			(c) => c.clothingId === a.clothingId,
		);
		if (reused.length === 1) {
			return true;
		} else {
			return reused[0].id === a.id;
		}
	});

	const unusedEssentialProvisions = trip.essentialProvisions.filter(
		(a) =>
			!trip.containerProvisions.some((b) =>
				b.essentialProvisions.some((c) => a.id === c.id),
			),
	);

	return (
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
			{containerProvisions.map((containerProvision) => (
				<ContainerProvisionCard
					key={containerProvision.id}
					containerProvision={containerProvision}
					updateOrder={updateOrder}
					unusedEssentialProvisions={unusedEssentialProvisions}
					unusedClothingProvisions={unusedClothingProvisions}
				/>
			))}
		</div>
	);
}

function ContainerProvisionCard({
	containerProvision,
	updateOrder,
	unusedClothingProvisions,
	unusedEssentialProvisions,
}: {
	containerProvision: ContainerProvision & {
		container: Container;
		clothingProvisions: (ClothingProvision & { clothing: Clothing })[];
		essentialProvisions: (EssentialProvision & { essential: Essential })[];
	};
	updateOrder: OptimisticUpdate;
	unusedClothingProvisions: (ClothingProvision & { clothing: Clothing })[];
	unusedEssentialProvisions: (EssentialProvision & { essential: Essential })[];
}) {
	const isClothes = containerProvision.container.type === ContainerType.Clothes;
	const items = isClothes
		? containerProvision.clothingProvisions
		: containerProvision.essentialProvisions;

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
				order = LexoRank.parse(next.containerOrder!).genPrev();
			} else if (newIndex === items.length - 1) {
				const prev = items[newIndex];
				order = LexoRank.parse(prev.containerOrder!).genNext();
			} else {
				const prev = items[newIndex];
				const offset = oldIndex > newIndex ? -1 : 1;
				const next = items[newIndex + offset];
				order = LexoRank.parse(next.containerOrder!).between(
					LexoRank.parse(prev.containerOrder!),
				);
			}

			updateOrder({
				idx: oldIndex,
				order: order.toString(),
				containerProvisionId: containerProvision.id,
			});
			await (
				isClothes
					? changeClothingProvisionContainerOrder
					: changeEssentialProvisionContainerOrder
			)(items[oldIndex].id, order.toString());
		});

	return (
		<Card>
			<CardHeader className="flex flex-row items-center gap-2 space-y-0">
				<div className="flex-1">
					<CardTitle>{containerProvision.container.name}</CardTitle>
					<CardDescription>{containerProvision.container.type}</CardDescription>
				</div>
				{isClothes ? (
					<AddToContainerClothingDialog
						clothingProvisions={unusedClothingProvisions}
						containerProvision={containerProvision}
					/>
				) : (
					<AddToContainerEssentialDialog
						essentialProvisions={unusedEssentialProvisions}
						containerProvisions={containerProvision}
					/>
				)}
				<DeleteContainerProvisionDialog
					containerProvision={containerProvision}
				/>
			</CardHeader>
			<CardContent className="flex flex-col">
				<DragDropProvider onDragEnd={handleDragEnd}>
					{isClothes
						? containerProvision.clothingProvisions.map(
								({ clothing, id }, index) => (
									<ClothingProvisionItem
										key={id}
										index={index}
										clothingProvisionId={id}
										clothingName={generateClothingName(clothing)}
										containerProvisionId={containerProvision.id}
									/>
								),
							)
						: containerProvision.essentialProvisions.map(
								({ essential, id }, index) => (
									<EssentialProvisionItem
										key={id}
										index={index}
										essentialProvisionId={id}
										essentialName={essential.name}
										containerProvisionId={containerProvision.id}
									/>
								),
							)}
				</DragDropProvider>
			</CardContent>
		</Card>
	);
}

function ClothingProvisionItem({
	clothingProvisionId,
	clothingName,
	containerProvisionId,
	index,
}: {
	clothingProvisionId: string;
	clothingName: string;
	containerProvisionId: string;
	index: number;
}) {
	const { ref, handleRef, isDragging } = useSortable({
		id: clothingProvisionId,
		index,
	});

	return (
		<div
			className={cn(
				'flex cursor-default items-center justify-between gap-2 rounded-lg p-1 select-none',
				isDragging && 'z-50 bg-white shadow-2xl',
			)}
			ref={ref}
		>
			<Menu
				ref={handleRef}
				className="cursor-grab touch-none text-neutral-400"
			/>
			<p className="text-md flex-1">{clothingName}</p>
			<DeleteFromContainerClothing
				clothingProvisionId={clothingProvisionId}
				containerProvisionId={containerProvisionId}
			/>
		</div>
	);
}

function EssentialProvisionItem({
	essentialProvisionId,
	essentialName,
	containerProvisionId,
	index,
}: {
	essentialProvisionId: string;
	essentialName: string;
	containerProvisionId: string;
	index: number;
}) {
	const { ref, handleRef, isDragging } = useSortable({
		id: essentialProvisionId,
		index,
	});

	return (
		<div
			className={cn(
				'flex cursor-default items-center justify-between gap-2 rounded-lg p-1 select-none',
				isDragging && 'z-50 bg-white shadow-2xl',
			)}
			ref={ref}
		>
			<Menu
				ref={handleRef}
				className="cursor-grab touch-none text-neutral-400"
			/>
			<p className="text-md flex-1">{essentialName}</p>
			<DeleteFromContainerEssential
				essentialProvisionId={essentialProvisionId}
				containerProvisionId={containerProvisionId}
			/>
		</div>
	);
}
