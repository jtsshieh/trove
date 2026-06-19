import { queryOptions } from '@tanstack/react-query';

import { fetchAllEssentials } from './actions';

export const essentialsQueryOptions = queryOptions({
	queryKey: ['essentials'],
	queryFn: fetchAllEssentials,
});
