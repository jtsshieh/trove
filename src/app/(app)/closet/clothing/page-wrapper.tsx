'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

import { brandsQueryOptions, clothingTypesQueryOptions } from './_data/queries';
import { WardrobeList } from './wardrobe-list';

export function WardrobeContent() {
	const { data: brands } = useSuspenseQuery(brandsQueryOptions);
	const { data: types } = useSuspenseQuery(clothingTypesQueryOptions);

	return <WardrobeList brands={brands} types={types} />;
}
