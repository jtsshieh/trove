'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { Suspense } from 'react';

import { BathroomNature } from '@/generated/prisma/enums';

import { Skeleton } from '@/components/ui/skeleton';

import type {
	BathroomProductWithVariants,
	BathroomUnitWithProduct,
} from './_data/api';
import {
	bathroomProductsQueryOptions,
	bathroomUnitsQueryOptions,
} from './_data/queries';
import { BathroomAppliances } from './bathroom-appliances';
import { BathroomCatalogList } from './bathroom-catalog-list';
import { BathroomConsumables } from './bathroom-consumables';
import { BathroomLaunderables } from './bathroom-launderables';

export function BathroomCatalogContent() {
	return (
		<Suspense fallback={<BathroomGridSkeleton />}>
			<BathroomCatalogData />
		</Suspense>
	);
}

function BathroomCatalogData() {
	const { data: products } = useSuspenseQuery(bathroomProductsQueryOptions);
	return <BathroomCatalogList products={products} />;
}

/** Narrows the catalog + live units to a single nature for a stock-management tab. */
function useNatureData(nature: BathroomNature): {
	products: BathroomProductWithVariants[];
	units: BathroomUnitWithProduct[];
} {
	const { data: products } = useSuspenseQuery(bathroomProductsQueryOptions);
	const { data: units } = useSuspenseQuery(bathroomUnitsQueryOptions);
	return {
		products: products.filter((p) => p.nature === nature),
		units: units.filter((u) => u.variant.product.nature === nature),
	};
}

export function BathroomConsumablesContent() {
	return (
		<Suspense fallback={<BathroomRowsSkeleton />}>
			<BathroomConsumablesData />
		</Suspense>
	);
}

function BathroomConsumablesData() {
	const { products } = useNatureData(BathroomNature.Consumable);
	return <BathroomConsumables products={products} />;
}

export function BathroomAppliancesContent() {
	return (
		<Suspense fallback={<BathroomRowsSkeleton />}>
			<BathroomAppliancesData />
		</Suspense>
	);
}

function BathroomAppliancesData() {
	const { products, units } = useNatureData(BathroomNature.Appliance);
	return <BathroomAppliances products={products} units={units} />;
}

export function BathroomLaunderablesContent() {
	return (
		<Suspense fallback={<BathroomRowsSkeleton />}>
			<BathroomLaunderablesData />
		</Suspense>
	);
}

function BathroomLaunderablesData() {
	const { products, units } = useNatureData(BathroomNature.Launderable);
	return <BathroomLaunderables products={products} units={units} />;
}

function BathroomGridSkeleton() {
	return (
		<div className="flex flex-col gap-8">
			{Array.from({ length: 2 }).map((_, group) => (
				<div key={group}>
					<Skeleton className="mb-2 h-7 w-40" />
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton key={i} className="h-56 w-full rounded-xl" />
						))}
					</div>
				</div>
			))}
		</div>
	);
}

function BathroomRowsSkeleton() {
	return (
		<div className="flex flex-col gap-2">
			{Array.from({ length: 6 }).map((_, i) => (
				<Skeleton key={i} className="h-16 w-full rounded-xl" />
			))}
		</div>
	);
}
