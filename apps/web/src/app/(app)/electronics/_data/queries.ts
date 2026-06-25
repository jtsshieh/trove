import { queryOptions } from '@tanstack/react-query';

import { fetchElectronics } from './api';

export const electronicsKeys = {
	electronics: ['electronics'] as const,
};

export const electronicsQueryOptions = queryOptions({
	queryKey: electronicsKeys.electronics,
	queryFn: fetchElectronics,
});

// Re-exported so electronics screens can pull the brand query options from one
// place even though brands own their resource (the picker filters by domain).
export { brandsQueryOptions, brandKeys } from '@/app/(app)/closet/clothing/brands/_data/queries';
