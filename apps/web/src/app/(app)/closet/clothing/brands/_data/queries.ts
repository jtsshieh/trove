import { queryOptions } from '@tanstack/react-query';

import { fetchBrands } from './api';

export const brandKeys = {
	all: ['brands'] as const,
};

export const brandsQueryOptions = queryOptions({
	queryKey: brandKeys.all,
	queryFn: fetchBrands,
});
