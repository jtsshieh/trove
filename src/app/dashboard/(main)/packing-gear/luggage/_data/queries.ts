import { queryOptions } from '@tanstack/react-query';

import { fetchLuggage } from './api';

export const luggageKeys = {
	luggage: ['luggage'] as const,
};

export const luggageQueryOptions = queryOptions({
	queryKey: luggageKeys.luggage,
	queryFn: fetchLuggage,
});
