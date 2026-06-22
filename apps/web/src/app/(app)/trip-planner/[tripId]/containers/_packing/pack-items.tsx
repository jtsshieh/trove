'use client';

import { PillBottle, Shirt } from 'lucide-react';
import type { ReactNode } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { ItemDisplay } from '@/components/ui/item-display';
import { cn } from '@/lib/utils';

import {
	useMarkClothingProvisionPacked,
	useMarkEssentialProvisionPacked,
} from './_data/mutations';

function PackRow({
	id,
	name,
	imageKey,
	fallbackIcon,
	packed,
	isLoading,
	count = 1,
	onToggle,
}: {
	id: string;
	name: string;
	imageKey?: string | null;
	fallbackIcon: ReactNode;
	packed: boolean;
	isLoading: boolean;
	/** How many identical provisions this row stands in for (display-only ×N). */
	count?: number;
	onToggle: (checked: boolean) => void;
}) {
	return (
		<label
			htmlFor={id}
			className={cn(
				'group/row -mx-1.5 flex items-center gap-3 rounded-lg px-1.5 py-1.5 transition-colors duration-[var(--dur-fast)] outline-none hover-hover:hover:bg-surface-sunken has-[:focus-visible]:bg-surface-sunken motion-safe:active:scale-[0.99]',
				isLoading && 'opacity-60',
			)}
		>
			<Checkbox
				id={id}
				checked={packed}
				disabled={isLoading}
				onCheckedChange={(checked) => onToggle(Boolean(checked))}
				className="size-5 rounded-md"
			/>
			<ItemDisplay
				size="chip"
				name={name}
				imageKey={imageKey}
				fallbackIcon={fallbackIcon}
				className={cn(
					'flex-1 transition-opacity duration-[var(--dur-fast)]',
					packed && 'opacity-50 [&_span]:line-through',
				)}
			/>
			{count > 1 && (
				<span
					data-testid="pack-stack-count"
					className="bg-brand text-brand-foreground shrink-0 rounded-full px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums"
					title={`${count} units`}
				>
					×{count}
				</span>
			)}
		</label>
	);
}

export function ClothingPackItem({
	tripId,
	clothingProvisionId,
	clothingName,
	imageKey,
	packed,
	count = 1,
}: {
	tripId: string;
	clothingProvisionId: string;
	clothingName: string;
	imageKey?: string | null;
	packed: boolean;
	/** Identical clothing provisions are collapsed into one ×N row (display-only). */
	count?: number;
}) {
	const mutation = useMarkClothingProvisionPacked(tripId);

	return (
		<PackRow
			id={clothingProvisionId}
			name={clothingName}
			imageKey={imageKey}
			fallbackIcon={<Shirt />}
			packed={packed}
			isLoading={mutation.isPending}
			count={count}
			onToggle={(checked) => {
				mutation.mutate({ id: clothingProvisionId, packed: checked });
			}}
		/>
	);
}

export function EssentialPackItem({
	tripId,
	essentialProvisionId,
	essentialName,
	imageKey,
	packed,
}: {
	tripId: string;
	essentialProvisionId: string;
	essentialName: string;
	imageKey?: string | null;
	packed: boolean;
}) {
	const mutation = useMarkEssentialProvisionPacked(tripId);

	return (
		<PackRow
			id={essentialProvisionId}
			name={essentialName}
			imageKey={imageKey}
			fallbackIcon={<PillBottle />}
			packed={packed}
			isLoading={mutation.isPending}
			onToggle={(checked) => {
				mutation.mutate({ id: essentialProvisionId, packed: checked });
			}}
		/>
	);
}
