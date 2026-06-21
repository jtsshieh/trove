'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

import { brandsQueryOptions } from './_data/queries';
import { BrandsList } from './brands-list';

export function BrandsListContent() {
	const { data: brands } = useSuspenseQuery(brandsQueryOptions);
	return <BrandsList brands={brands} />;
}
