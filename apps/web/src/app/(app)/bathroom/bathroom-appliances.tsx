'use client';

import { ArrowDownToLine, ArrowUpFromLine, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyList } from '@/components/empty-list';

import type {
	BathroomProductWithVariants,
	BathroomUnitWithProduct,
} from './_data/api';
import {
	useCheckInBathroomUnit,
	useCheckOutBathroomUnit,
	useEndBathroomUnit,
} from './_data/mutations';
import {
	ProductStockCard,
	StockSummary,
	unitLabel,
	unitsByVariant,
} from './bathroom-stock-shared';

interface BathroomAppliancesProps {
	products: BathroomProductWithVariants[];
	units: BathroomUnitWithProduct[];
}

/**
 * Appliance stock board. Per appliance: owned count + in-use / in-stock summary, a
 * "+ Buy" to add a unit, and per-unit lifecycle (check out → check in / retire).
 */
export function BathroomAppliances({
	products,
	units,
}: BathroomAppliancesProps) {
	if (products.length === 0)
		return (
			<EmptyList
				main="No appliances yet"
				sub="Add an appliance in the Catalog tab, then buy units to check them in and out."
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
								{ label: 'in stock', value: variant.stock.inStock },
								{ label: 'in use', value: variant.stock.inUse },
							]}
						/>
					)}
					renderUnit={(unit) => <ApplianceUnitRow key={unit.id} unit={unit} />}
				/>
			))}
		</div>
	);
}

function ApplianceUnitRow({ unit }: { unit: BathroomUnitWithProduct }) {
	const checkOut = useCheckOutBathroomUnit();
	const checkIn = useCheckInBathroomUnit();
	const end = useEndBathroomUnit();

	return (
		<li className="flex items-center justify-between gap-3 px-3 py-2 not-first:border-t">
			<p className="text-muted-foreground min-w-0 truncate text-xs">
				{unitLabel(unit)} ·{' '}
				<span className={unit.state === 'InUse' ? 'text-brand' : undefined}>
					{unit.state === 'InUse' ? 'In use' : 'In stock'}
				</span>
			</p>
			<div className="flex shrink-0 items-center gap-1.5">
				{unit.state === 'InStock' ? (
					<Button
						size="sm"
						variant="secondary"
						loading={checkOut.isPending}
						onClick={() => checkOut.mutate({ id: unit.id })}
					>
						<ArrowUpFromLine /> Check out
					</Button>
				) : (
					<>
						<Button
							size="sm"
							variant="secondary"
							loading={checkIn.isPending}
							onClick={() => checkIn.mutate(unit.id)}
						>
							<ArrowDownToLine /> Check in
						</Button>
						<Button
							size="sm"
							variant="destructive"
							loading={end.isPending}
							onClick={() => end.mutate(unit.id)}
						>
							<Trash2 /> Retire
						</Button>
					</>
				)}
			</div>
		</li>
	);
}
