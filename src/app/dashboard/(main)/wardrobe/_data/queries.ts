import { queryOptions } from '@tanstack/react-query';

import { fetchAllBrands, fetchClothingTypesWithClothes } from './actions';

export const brandsQueryOptions = queryOptions({
	queryKey: ['brands'],
	queryFn: fetchAllBrands,
});

export const clothingTypesQueryOptions = queryOptions({
	queryKey: ['clothing-types-with-clothes'],
	queryFn: fetchClothingTypesWithClothes,
});
