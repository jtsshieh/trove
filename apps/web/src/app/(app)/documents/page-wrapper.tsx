'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

import { documentsQueryOptions } from './_data/queries';
import { DocumentsList } from './documents-list';

export function DocumentsListContent() {
	const { data: documents } = useSuspenseQuery(documentsQueryOptions);
	return <DocumentsList documents={documents} />;
}
