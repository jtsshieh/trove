import { queryOptions } from '@tanstack/react-query';

import { fetchTrips } from './api';

export const tripsQueryOptions = queryOptions({
	queryKey: ['trips'],
	queryFn: fetchTrips,
});
