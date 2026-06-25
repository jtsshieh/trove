import { queryOptions } from '@tanstack/react-query';

import { fetchDocuments } from './api';

export const documentsKeys = {
	all: ['documents'] as const,
};

export const documentsQueryOptions = queryOptions({
	queryKey: documentsKeys.all,
	queryFn: fetchDocuments,
});
