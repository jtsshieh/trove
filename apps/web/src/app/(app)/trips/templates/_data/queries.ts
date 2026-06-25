import { queryOptions } from '@tanstack/react-query';

import { fetchTemplatesData } from './api';

export const templatesKeys = {
	all: ['essential-group-templates'] as const,
};

export const templatesQueryOptions = queryOptions({
	queryKey: templatesKeys.all,
	queryFn: fetchTemplatesData,
});
