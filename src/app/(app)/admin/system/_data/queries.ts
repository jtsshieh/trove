import { queryOptions } from '@tanstack/react-query';

import { fetchSystemStatus } from './api';

export const systemKeys = {
	status: ['system', 'status'] as const,
};

export const systemStatusQueryOptions = queryOptions({
	queryKey: systemKeys.status,
	queryFn: fetchSystemStatus,
});
