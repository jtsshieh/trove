'use client';

import { PillBottle, Shirt } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import { ItemDisplay } from '@/components/ui/item-display';
import { cn } from '@/lib/utils';

import {
	useMarkClothingPacked,
	useMarkEssentialPacked,
} from './_data/mutations';

/**
 * A packed-toggleable row for a direct ("containerless") item packed straight into
 * a suitcase. Mirrors `ContainerPackItem`; routes the toggle to the clothing or
 * essential packed endpoint based on `kind`.
 */
export function DirectPackItem({
	tripId,
	provisionId,
	kind,
	name,
	imageKey,
	packed,
}: {
	tripId: string;
	provisionId: string;
	kind: 'clothing' | 'essential';
	name: string;
	imageKey?: string | null;
	packed: boolean;
}) {
	const markClothing = useMarkClothingPacked(tripId);
	const markEssential = useMarkEssentialPacked(tripId);
	const mutation = kind === 'clothing' ? markClothing : markEssential;
	const isLoading = mutation.isPending;

	return (
		<label
			htmlFor={provisionId}
			data-testid="luggage-direct-pack-item"
			data-name={name}
			className={cn(
				'group/row -mx-1.5 flex items-center gap-3 rounded-lg px-1.5 py-1.5 transition-colors duration-[var(--dur-fast)] outline-none hover-hover:hover:bg-surface-sunken has-[:focus-visible]:bg-surface-sunken motion-safe:active:scale-[0.99]',
				isLoading && 'opacity-60',
			)}
		>
			<Checkbox
				id={provisionId}
				checked={packed}
				disabled={isLoading}
				onCheckedChange={async (checked) => {
					try {
						await mutation.mutateAsync({
							id: provisionId,
							packed: Boolean(checked),
						});
					} catch {
						// surfaced via the mutation's onError toast
					}
				}}
				className="size-5 rounded-md"
			/>
			<ItemDisplay
				size="chip"
				name={name}
				imageKey={imageKey}
				fallbackIcon={kind === 'clothing' ? <Shirt /> : <PillBottle />}
				className={cn(
					'flex-1 transition-opacity duration-[var(--dur-fast)]',
					packed && 'opacity-50 [&_span]:line-through',
				)}
			/>
		</label>
	);
}
