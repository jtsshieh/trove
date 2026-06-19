import { queryOptions } from '@tanstack/react-query';

import { fetchAllTrips } from './actions';

export const tripsQueryOptions = queryOptions({
	queryKey: ['trips'],
	queryFn: fetchAllTrips,
});
