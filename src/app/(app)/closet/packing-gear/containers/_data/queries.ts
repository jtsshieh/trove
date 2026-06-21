import { queryOptions } from '@tanstack/react-query';

import { fetchContainers } from './api';

export const containerKeys = {
	all: ['containers'] as const,
};

export const containersQueryOptions = queryOptions({
	queryKey: containerKeys.all,
	queryFn: fetchContainers,
});
