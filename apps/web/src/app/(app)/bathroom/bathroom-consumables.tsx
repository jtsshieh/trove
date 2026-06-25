'use client';

import { Minus, Package, Plus, TriangleAlert } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { EmptyList } from '@/components/empty-list';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { imageSrc } from '@/lib/images';
import { formatVolume } from '@/lib/units';
import { cn } from '@/lib/utils';

import type {
	BathroomProductWithVariants,
	BathroomVariantWithStock,
} from './_data/api';
import {
	useAddBathroomBatch,
	useUseOneBathroomVariant,
} from './_data/mutations';

interface BathroomConsumablesProps {
	products: BathroomProductWithVariants[];
}

/**
 * The "how many do I have / buy more / use one" surface for consumables. Each
 * variant shows its on-hand count with a − (use one) / + (buy one) stepper and a
 * "Buy batch" dialog for adding many at once.
 */
export function BathroomConsumables({ products }: BathroomConsumablesProps) {
	if (products.length === 0)
		return (
			<EmptyList
				main="No consumables yet"
				sub="Add a consumable in the Catalog tab to start tracking how much you have."
			/>
		);

	return (
		<div className="flex flex-col gap-3">
			{products.map((product) => (
				<ConsumableCard key={product.id} product={product} />
			))}
		</div>
	);
}

function ConsumableCard({
	product,
}: {
	product: BathroomProductWithVariants;
}) {
	return (
		<Card className="gap-0 overflow-hidden py-0">
			<div className="flex items-center gap-3 p-3">
				<div className="bg-muted text-muted-foreground relative size-12 shrink-0 overflow-hidden rounded-lg">
					{product.imageKey ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={imageSrc(product.imageKey)}
							alt={product.name}
							loading="lazy"
							className="size-full object-cover"
						/>
					) : (
						<Package className="absolute inset-0 m-auto size-1/3 opacity-40" />
					)}
				</div>
				<div className="min-w-0">
					<p className="font-heading truncate text-sm font-medium">
						{product.name}
					</p>
					<p className="text-muted-foreground truncate text-xs">
						{[product.brandName, product.typeName].filter(Boolean).join(' · ') ||
							'Consumable'}
					</p>
				</div>
			</div>
			<ul className="flex flex-col border-t">
				{product.variants.map((variant) => (
					<ConsumableVariantRow
						key={variant.id}
						product={product}
						variant={variant}
					/>
				))}
			</ul>
		</Card>
	);
}

function ConsumableVariantRow({
	product,
	variant,
}: {
	product: BathroomProductWithVariants;
	variant: BathroomVariantWithStock;
}) {
	const useOne = useUseOneBathroomVariant();
	const buyOne = useAddBathroomBatch();

	const onHand = variant.stock.onHand;
	const lowStock = onHand <= 1;
	const label = variant.label || 'Standard';
	const volume =
		variant.capacityMl != null
			? formatVolume(variant.capacityMl, 'Milliliters')
			: null;

	const busy = useOne.isPending || buyOne.isPending;

	return (
		<li className="flex items-center justify-between gap-3 px-3 py-2.5 not-first:border-t">
			<div className="min-w-0">
				<p className="truncate text-sm">
					{label}
					{volume && (
						<span className="text-muted-foreground ml-1 tabular-nums">
							· {volume}
						</span>
					)}
				</p>
				{lowStock && (
					<p className="text-destructive flex items-center gap-1 text-xs">
						<TriangleAlert className="size-3" />
						{onHand === 0 ? 'Out of stock' : 'Low — buy more'}
					</p>
				)}
			</div>
			<div className="flex shrink-0 items-center gap-2">
				<div className="flex items-center gap-1.5">
					<Button
						size="icon-sm"
						variant="outline"
						disabled={busy || onHand === 0}
						loading={useOne.isPending}
						onClick={() => useOne.mutate(variant.id)}
						aria-label={`Use one ${label}`}
					>
						<Minus />
					</Button>
					<span
						className={cn(
							'min-w-8 text-center text-base font-semibold tabular-nums',
							lowStock && 'text-destructive',
						)}
						aria-label={`${onHand} on hand`}
					>
						{onHand}
					</span>
					<Button
						size="icon-sm"
						variant="outline"
						disabled={busy}
						loading={buyOne.isPending}
						onClick={() =>
							buyOne.mutate({ variantId: variant.id, input: { quantity: 1 } })
						}
						aria-label={`Buy one ${label}`}
					>
						<Plus />
					</Button>
				</div>
				<BuyBatchDialog product={product} variant={variant} />
			</div>
		</li>
	);
}

function BuyBatchDialog({
	product,
	variant,
}: {
	product: BathroomProductWithVariants;
	variant: BathroomVariantWithStock;
}) {
	const [open, setOpen] = useState(false);
	const [quantity, setQuantity] = useState(1);
	const buyBatch = useAddBathroomBatch();

	const label = [product.name, variant.label].filter(Boolean).join(' · ');

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		try {
			await buyBatch.mutateAsync({ variantId: variant.id, input: { quantity } });
			setQuantity(1);
			setOpen(false);
		} catch {
			// onError toast already shown; keep the dialog open for a retry.
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) setQuantity(1);
				setOpen(next);
			}}
		>
			<DialogTrigger render={<Button size="sm" variant="secondary" />}>
				Buy batch
			</DialogTrigger>
			<DialogContent render={<form onSubmit={onSubmit} />}>
				<DialogHeader>
					<DialogTitle>Buy a batch</DialogTitle>
					<DialogDescription>
						Add several of {label} to your stock at once.
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-2">
					<Label>Quantity</Label>
					<Input
						type="number"
						min={1}
						value={quantity}
						onChange={(event) =>
							setQuantity(Math.max(1, Math.trunc(+event.target.value) || 1))
						}
					/>
				</div>
				<DialogFooter>
					<Button type="submit" loading={buyBatch.isPending}>
						Add {quantity} to stock
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
