'use client';

import { Minus, Package, Plus } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { imageSrc } from '@/lib/images';
import { formatVolume } from '@/lib/units';

import type {
	BathroomProductWithVariants,
	BathroomUnitWithProduct,
	BathroomVariantWithStock,
} from './_data/api';
import {
	useAddBathroomBatch,
	useUseOneBathroomVariant,
} from './_data/mutations';

/** Groups live (non-Gone) units by their variant id for O(1) per-variant lookup. */
export function unitsByVariant(
	units: BathroomUnitWithProduct[],
): Map<string, BathroomUnitWithProduct[]> {
	const map = new Map<string, BathroomUnitWithProduct[]>();
	for (const unit of units) {
		const list = map.get(unit.variantId) ?? [];
		list.push(unit);
		map.set(unit.variantId, list);
	}
	return map;
}

/** A short "Variant · 250 mL" label for a single unit. */
export function unitLabel(unit: BathroomUnitWithProduct): string {
	const volume =
		unit.variant.capacityMl != null
			? formatVolume(unit.variant.capacityMl, 'Milliliters')
			: null;
	return [unit.variant.label || 'Standard', volume].filter(Boolean).join(' · ');
}

/** A compact "3 in stock · 1 in use" stock summary; zero-value parts are dropped. */
export function StockSummary({
	parts,
}: {
	parts: { label: string; value: number }[];
}) {
	const shown = parts.filter((p) => p.value > 0);
	if (shown.length === 0)
		return <span className="text-muted-foreground text-xs">None owned</span>;
	return (
		<span className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 text-xs tabular-nums">
			{shown.map((part, i) => (
				<span key={part.label}>
					{i > 0 && <span className="mr-1.5">·</span>}
					<span className="text-foreground font-semibold">{part.value}</span>{' '}
					{part.label}
				</span>
			))}
		</span>
	);
}

/**
 * A per-product stock card shared by the Appliances and Launderables tabs: an image
 * header with the total owned count, then one section per variant carrying its stock
 * summary, a "+ Buy" (acquire one unit), and the nature-specific unit rows.
 */
export function ProductStockCard({
	product,
	byVariant,
	summary,
	renderUnit,
}: {
	product: BathroomProductWithVariants;
	byVariant: Map<string, BathroomUnitWithProduct[]>;
	summary: (variant: BathroomVariantWithStock) => ReactNode;
	renderUnit: (unit: BathroomUnitWithProduct) => ReactNode;
}) {
	const owned = product.variants.reduce((sum, v) => sum + v.stock.onHand, 0);
	const multiVariant = product.variants.length > 1;

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
				<div className="min-w-0 flex-1">
					<p className="font-heading truncate text-sm font-medium">
						{product.name}
					</p>
					<p className="text-muted-foreground truncate text-xs">
						{[product.brandName, product.typeName].filter(Boolean).join(' · ') ||
							product.nature}
					</p>
				</div>
				<span className="text-muted-foreground shrink-0 text-xs tabular-nums">
					<span className="text-foreground text-base font-semibold">
						{owned}
					</span>{' '}
					owned
				</span>
			</div>
			<div className="flex flex-col border-t">
				{product.variants.map((variant) => {
					const variantUnits = byVariant.get(variant.id) ?? [];
					return (
						<section key={variant.id} className="not-first:border-t">
							<div className="flex items-center justify-between gap-3 px-3 py-2">
								<div className="min-w-0">
									{multiVariant && (
										<p className="truncate text-sm">
											{variant.label || 'Standard'}
											{variant.capacityMl != null && (
												<span className="text-muted-foreground ml-1 tabular-nums">
													· {formatVolume(variant.capacityMl, 'Milliliters')}
												</span>
											)}
										</p>
									)}
									{summary(variant)}
								</div>
								<div className="flex shrink-0 items-center gap-1.5">
									<RemoveOneButton
										variantId={variant.id}
										onHand={variant.stock.onHand}
									/>
									<BuyOneButton variantId={variant.id} />
								</div>
							</div>
							{variantUnits.length > 0 && (
								<ul className="bg-muted/30 flex flex-col border-t">
									{variantUnits.map((unit) => renderUnit(unit))}
								</ul>
							)}
						</section>
					);
				})}
			</div>
		</Card>
	);
}

/** "+ Buy" — acquires a single unit (a batch of 1) of the variant. */
function BuyOneButton({ variantId }: { variantId: string }) {
	const buy = useAddBathroomBatch();
	return (
		<Button
			size="sm"
			variant="outline"
			loading={buy.isPending}
			onClick={() => buy.mutate({ variantId, input: { quantity: 1 } })}
		>
			<Plus /> Buy
		</Button>
	);
}

/** "− Remove" — drops one on-hand unit of the variant (disabled when none left). */
function RemoveOneButton({
	variantId,
	onHand,
}: {
	variantId: string;
	onHand: number;
}) {
	const removeOne = useUseOneBathroomVariant();
	return (
		<Button
			size="sm"
			variant="outline"
			disabled={onHand === 0}
			loading={removeOne.isPending}
			onClick={() => removeOne.mutate(variantId)}
			aria-label="Remove one"
		>
			<Minus /> Remove
		</Button>
	);
}
