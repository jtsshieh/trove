'use client';

import { Plus } from 'lucide-react';

import { DisplayToggle } from '@/components/display-mode';
import { Button } from '@/components/ui/button';

import { useRequestOutfitCreate } from './outfit-actions-context';

/**
 * The outfits page header — static title + the display toggle and New outfit
 * trigger. The trigger drives the builder's create flow through the outfit actions
 * context, so it paints immediately while the grid (and the editor dialog it opens)
 * streams.
 */
export function OutfitsHeader() {
	const requestCreate = useRequestOutfitCreate();

	return (
		<header className="mb-4 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
			<div className="min-w-0 flex-1">
				<h1 className="text-2xl font-bold sm:text-3xl">Outfits</h1>
				<h2 className="text-muted-foreground text-sm sm:text-base">
					Reusable looks you can drop onto any trip day.
				</h2>
			</div>
			<div className="flex shrink-0 items-center gap-2">
				<DisplayToggle />
				<Button variant="brand" onClick={requestCreate}>
					<Plus />
					New outfit
				</Button>
			</div>
		</header>
	);
}
