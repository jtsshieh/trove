import { queryOptions } from '@tanstack/react-query';

import {
	fetchBathroomProducts,
	fetchBathroomTypes,
	fetchBathroomUnits,
} from './api';

export const bathroomKeys = {
	products: ['bathroom-products'] as const,
	units: ['bathroom-units'] as const,
	types: ['bathroom-types'] as const,
};

export const bathroomProductsQueryOptions = queryOptions({
	queryKey: bathroomKeys.products,
	queryFn: fetchBathroomProducts,
});

export const bathroomUnitsQueryOptions = queryOptions({
	queryKey: bathroomKeys.units,
	queryFn: fetchBathroomUnits,
});

export const bathroomTypesQueryOptions = queryOptions({
	queryKey: bathroomKeys.types,
	queryFn: fetchBathroomTypes,
});
