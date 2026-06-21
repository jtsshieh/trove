import { queryOptions } from '@tanstack/react-query';

import { fetchClothes, fetchClothingTypes } from './api';

export const wardrobeKeys = {
	clothing: ['clothing'] as const,
	clothingTypes: ['clothing-types'] as const,
};

export const clothesQueryOptions = queryOptions({
	queryKey: wardrobeKeys.clothing,
	queryFn: fetchClothes,
});

export const clothingTypesQueryOptions = queryOptions({
	queryKey: wardrobeKeys.clothingTypes,
	queryFn: fetchClothingTypes,
});

// Re-exported so wardrobe screens can pull brand + clothing query options from one
// place even though brands own their resource.
export { brandsQueryOptions, brandKeys } from '../brands/_data/queries';
