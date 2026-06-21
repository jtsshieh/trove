'use client';

import { Plus } from 'lucide-react';

import { DisplayToggle } from '@/components/display-mode';
import { Button } from '@/components/ui/button';

import { useRequestOutfitCreate } from './outfit-actions-context';

/** Outfits tab-bar actions: display toggle plus the New outfit trigger. */
export function OutfitTabActions() {
	const requestCreate = useRequestOutfitCreate();

	return (
		<>
			<DisplayToggle />
			<Button variant="brand" onClick={requestCreate}>
				<Plus />
				New outfit
			</Button>
		</>
	);
}
