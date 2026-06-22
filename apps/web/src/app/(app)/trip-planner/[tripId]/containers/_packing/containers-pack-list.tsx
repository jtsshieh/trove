'use client';

import type {
	Clothing,
	ClothingProvision,
	Container,
	ContainerProvision,
	Essential,
	EssentialProvision,
} from '@/generated/prisma/client';
import { ContainerType } from '@/generated/prisma/enums';
import { Box, CheckCircle2 } from 'lucide-react';
import React from 'react';

import { EmptyState } from '@/components/ui/empty-state';
import { ItemDisplay } from '@/components/ui/item-display';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { generateClothingName } from '@/lib/generate-clothing-name';
import { cn } from '@/lib/utils';

import type { ContainerPackingBoard } from './_data/fetchers';
import { ClothingPackItem, EssentialPackItem } from './pack-items';

interface ContainerProvisionListProps {
	tripId: string;
	trip: ContainerPackingBoard;
}

export function ContainerPackList({
	tripId,
	trip,
}: ContainerProvisionListProps) {
	if (trip.containerProvisions.length === 0) {
		return (
			<EmptyState
				icon={<Box />}
				title="No containers to pack yet"
				description="Add containers to this trip and assign items to them, then come back here to pack."
			/>
		);
	}

	return (
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
			{trip.containerProvisions.map((containerProvision) => (
				<ContainerPackCard
					key={containerProvision.id}
					tripId={tripId}
					containerProvision={containerProvision}
				/>
			))}
		</div>
	);
}

function ContainerPackCard({
	tripId,
	containerProvision,
}: {
	tripId: string;
	containerProvision: ContainerProvision & {
		container: Container;
		clothingProvisions: (ClothingProvision & { clothing: Clothing })[];
		essentialProvisions: (EssentialProvision & { essential: Essential })[];
	};
}) {
	const isClothes = containerProvision.container.type === ContainerType.Clothes;

	const provisions = isClothes
		? containerProvision.clothingProvisions
		: containerProvision.essentialProvisions;

	const packed = provisions.reduce(
		(prev, provision) => (provision.packed ? prev + 1 : prev),
		0,
	);
	const toPack = provisions.length;
	const complete = toPack > 0 && packed === toPack;

	return (
		<Card
			data-complete={complete || undefined}
			className="data-[complete]:ring-ring-brand/40 transition-colors duration-[var(--dur-fast)]"
		>
			<CardContent className="flex flex-col gap-3">
				<div className="flex items-center gap-3">
					<ItemDisplay
						size="panel"
						mode="PictureOnly"
						name={containerProvision.container.name}
						imageKey={containerProvision.container.imageKey}
						fallbackIcon={<Box />}
					/>
					<div className="min-w-0 flex-1">
						<p className="truncate font-medium">
							{containerProvision.container.name}
						</p>
						<p className="text-muted-foreground text-xs">
							{containerProvision.container.type}
						</p>
					</div>
					<div className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-sm tabular-nums">
						{complete && <CheckCircle2 className="text-brand size-4" />}
						<span className={cn(complete && 'font-medium text-brand')}>
							{packed}/{toPack}
						</span>
					</div>
				</div>

				<Progress
					value={toPack === 0 ? 0 : (packed / toPack) * 100}
					className="h-1.5"
				/>

				{toPack === 0 ? (
					<p className="bg-surface-sunken text-muted-foreground rounded-md px-3 py-4 text-center text-xs">
						No items assigned to this container yet.
					</p>
				) : (
					<div className="flex flex-col">
						{isClothes
							? containerProvision.clothingProvisions.map(
									({ clothing, id, packed }) => (
										<ClothingPackItem
											key={id}
											tripId={tripId}
											clothingProvisionId={id}
											clothingName={generateClothingName(clothing)}
											imageKey={clothing.imageKey}
											packed={packed}
										/>
									),
								)
							: containerProvision.essentialProvisions.map(
									({ essential, id, packed }) => (
										<EssentialPackItem
											key={id}
											tripId={tripId}
											essentialProvisionId={id}
											essentialName={essential.name}
											imageKey={essential.imageKey}
											packed={packed}
										/>
									),
								)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
