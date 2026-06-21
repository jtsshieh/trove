'use client';

import { Box } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import { ItemDisplay } from '@/components/ui/item-display';
import { cn } from '@/lib/utils';

import { useMarkContainerPacked } from './_data/mutations';

export function ContainerPackItem({
	tripId,
	containerProvisionId,
	containerName,
	imageKey,
	packed,
}: {
	tripId: string;
	containerProvisionId: string;
	containerName: string;
	imageKey?: string | null;
	packed: boolean;
}) {
	const markContainerPacked = useMarkContainerPacked(tripId);
	const isLoading = markContainerPacked.isPending;

	return (
		<label
			htmlFor={containerProvisionId}
			className={cn(
				'group/row -mx-1.5 flex items-center gap-3 rounded-lg px-1.5 py-1.5 transition-colors duration-[var(--dur-fast)] outline-none hover-hover:hover:bg-surface-sunken has-[:focus-visible]:bg-surface-sunken motion-safe:active:scale-[0.99]',
				isLoading && 'opacity-60',
			)}
		>
			<Checkbox
				id={containerProvisionId}
				checked={packed}
				disabled={isLoading}
				onCheckedChange={async (checked) => {
					try {
						await markContainerPacked.mutateAsync({
							id: containerProvisionId,
							input: { packed: Boolean(checked) },
						});
					} catch {
						// surfaced via the mutation's onError toast
					}
				}}
				className="size-5 rounded-md"
			/>
			<ItemDisplay
				size="chip"
				name={containerName}
				imageKey={imageKey}
				fallbackIcon={<Box />}
				className={cn(
					'flex-1 transition-opacity duration-[var(--dur-fast)]',
					packed && 'opacity-50 [&_span]:line-through',
				)}
			/>
		</label>
	);
}
