import { queryOptions } from '@tanstack/react-query';

import { fetchAllLuggage } from './actions';

export const luggageQueryOptions = queryOptions({
	queryKey: ['luggage'],
	queryFn: fetchAllLuggage,
});
