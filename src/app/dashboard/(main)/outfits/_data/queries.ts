import { queryOptions } from '@tanstack/react-query';

import { fetchOutfits } from './api';

export const outfitKeys = {
	all: ['outfits'] as const,
};

export const outfitsQueryOptions = queryOptions({
	queryKey: outfitKeys.all,
	queryFn: fetchOutfits,
});
