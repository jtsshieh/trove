import { queryOptions } from '@tanstack/react-query';

import { fetchAllContainers } from './actions';

export const containersQueryOptions = queryOptions({
	queryKey: ['containers'],
	queryFn: fetchAllContainers,
});
