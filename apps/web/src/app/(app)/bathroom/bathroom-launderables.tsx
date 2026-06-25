'use client';

import { ArrowUpFromLine, Droplets, WashingMachine } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyList } from '@/components/empty-list';

import type {
	BathroomProductWithVariants,
	BathroomUnitWithProduct,
} from './_data/api';
import {
	useCheckOutBathroomUnit,
	useMarkBathroomUnitDirty,
	useMarkBathroomUnitWashed,
} from './_data/mutations';
import {
	ProductStockCard,
	StockSummary,
	unitLabel,
	unitsByVariant,
} from './bathroom-stock-shared';

interface BathroomLaunderablesProps {
	products: BathroomProductWithVariants[];
	units: BathroomUnitWithProduct[];
}

const STATE_LABEL: Record<string, string> = {
	InStock: 'Clean',
	InUse: 'In use',
	Dirty: 'Dirty',
};

/**
 * Launderable stock board. Per launderable: clean / in-use / dirty summary, a "+ Buy"
 * to add a unit, and per-unit laundry cycle (use → mark dirty → mark washed → clean).
 */
export function BathroomLaunderables({
	products,
	units,
}: BathroomLaunderablesProps) {
	if (products.length === 0)
		return (
			<EmptyList
				main="No launderables yet"
				sub="Add a launderable in the Catalog tab, then buy units to run them through the wash."
			/>
		);

	const byVariant = unitsByVariant(units);

	return (
		<div className="flex flex-col gap-3">
			{products.map((product) => (
				<ProductStockCard
					key={product.id}
					product={product}
					byVariant={byVariant}
					summary={(variant) => (
						<StockSummary
							parts={[
								{ label: 'clean', value: variant.stock.inStock },
								{ label: 'in use', value: variant.stock.inUse },
								{ label: 'dirty', value: variant.stock.dirty },
							]}
						/>
					)}
					renderUnit={(unit) => <LaunderableUnitRow key={unit.id} unit={unit} />}
				/>
			))}
		</div>
	);
}

function LaunderableUnitRow({ unit }: { unit: BathroomUnitWithProduct }) {
	const checkOut = useCheckOutBathroomUnit();
	const markDirty = useMarkBathroomUnitDirty();
	const markWashed = useMarkBathroomUnitWashed();

	return (
		<li className="flex items-center justify-between gap-3 px-3 py-2 not-first:border-t">
			<p className="text-muted-foreground min-w-0 truncate text-xs">
				{unitLabel(unit)} · {STATE_LABEL[unit.state] ?? unit.state}
			</p>
			<div className="flex shrink-0 items-center gap-1.5">
				{unit.state === 'InStock' && (
					<Button
						size="sm"
						variant="secondary"
						loading={checkOut.isPending}
						onClick={() => checkOut.mutate({ id: unit.id })}
					>
						<ArrowUpFromLine /> Use
					</Button>
				)}
				{unit.state === 'InUse' && (
					<Button
						size="sm"
						variant="outline"
						loading={markDirty.isPending}
						onClick={() => markDirty.mutate(unit.id)}
					>
						<Droplets /> Mark dirty
					</Button>
				)}
				{unit.state === 'Dirty' && (
					<Button
						size="sm"
						variant="secondary"
						loading={markWashed.isPending}
						onClick={() => markWashed.mutate(unit.id)}
					>
						<WashingMachine /> Mark washed
					</Button>
				)}
			</div>
		</li>
	);
}
