import { queryOptions } from '@tanstack/react-query';

import { fetchAllBrands } from './actions';

export const brandsQueryOptions = queryOptions({
	queryKey: ['brands'],
	queryFn: fetchAllBrands,
});
