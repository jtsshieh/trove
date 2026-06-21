import { queryOptions } from '@tanstack/react-query';

import { fetchEssentialGroups, fetchEssentials } from './api';

export const essentialsKeys = {
	essentials: ['essentials'] as const,
	groups: ['essential-groups'] as const,
};

export const essentialsQueryOptions = queryOptions({
	queryKey: essentialsKeys.essentials,
	queryFn: fetchEssentials,
});

export const essentialGroupsQueryOptions = queryOptions({
	queryKey: essentialsKeys.groups,
	queryFn: fetchEssentialGroups,
});
