import { CheckCircle2, Luggage } from 'lucide-react';
import React from 'react';

import { EmptyState } from '@/components/ui/empty-state';
import { ItemDisplay } from '@/components/ui/item-display';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { generateClothingName } from '@/lib/generate-clothing-name';
import { cn } from '@/lib/utils';

import type { LuggagePackingBoard } from './_data/api';
import { ContainerPackItem } from './container-item';
import { DirectPackItem } from './direct-item';

interface LuggagePackListProps {
	tripId: string;
	trip: LuggagePackingBoard;
}

export function LuggagePackList({ tripId, trip }: LuggagePackListProps) {
	if (trip.luggageProvisions.length === 0) {
		return (
			<EmptyState
				icon={<Luggage />}
				title="No luggage to pack yet"
				description="Add luggage to this trip and assign containers to it, then come back here to pack."
			/>
		);
	}

	return (
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
			{trip.luggageProvisions.map((luggageProvision) => {
				const containers = luggageProvision.containerProvisions;
				// Direct items packed straight into this suitcase (no container).
				const directItems = [
					...luggageProvision.clothingProvisions.map((p) => ({
						id: p.id,
						kind: 'clothing' as const,
						name: generateClothingName(p.clothing),
						imageKey: p.clothing.imageKey,
						packed: p.packed,
					})),
					...luggageProvision.essentialProvisions.map((p) => ({
						id: p.id,
						kind: 'essential' as const,
						name: p.essential.name,
						imageKey: p.essential.imageKey,
						packed: p.packed,
					})),
				];
				const packed =
					containers.reduce((prev, cp) => (cp.packed ? prev + 1 : prev), 0) +
					directItems.reduce((prev, it) => (it.packed ? prev + 1 : prev), 0);
				const toPack = containers.length + directItems.length;
				const complete = toPack > 0 && packed === toPack;

				return (
					<Card
						key={luggageProvision.id}
						data-complete={complete || undefined}
						className="data-[complete]:ring-ring-brand/40 transition-colors duration-[var(--dur-fast)]"
					>
						<CardContent className="flex flex-col gap-3">
							<div className="flex items-center gap-3">
								<ItemDisplay
									size="panel"
									mode="PictureOnly"
									name={luggageProvision.luggage.name}
									imageKey={luggageProvision.luggage.imageKey}
									fallbackIcon={<Luggage />}
								/>
								<div className="min-w-0 flex-1">
									<p className="truncate font-medium">
										{luggageProvision.luggage.name}
									</p>
									<p className="text-muted-foreground text-xs tabular-nums">
										{toPack} {toPack === 1 ? 'item' : 'items'} to pack
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
									Nothing assigned to this bag yet.
								</p>
							) : (
								<div className="flex flex-col">
									{containers.map(({ id, container, packed }) => (
										<ContainerPackItem
											key={id}
											tripId={tripId}
											containerProvisionId={id}
											containerName={container.name}
											imageKey={container.imageKey}
											packed={packed}
										/>
									))}
									{directItems.map((item) => (
										<DirectPackItem
											key={item.id}
											tripId={tripId}
											provisionId={item.id}
											kind={item.kind}
											name={item.name}
											imageKey={item.imageKey}
											packed={item.packed}
										/>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}
