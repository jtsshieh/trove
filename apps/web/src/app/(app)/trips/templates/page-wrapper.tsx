'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

import { templatesQueryOptions } from './_data/queries';
import { CreateTemplateGroupDialog } from './template-group-dialogs';
import { TemplatesList } from './templates-list';

/** The header action — the create-template dialog, fed the item catalog from cache. */
export function TemplatesHeaderActions() {
	const { data } = useSuspenseQuery(templatesQueryOptions);
	return <CreateTemplateGroupDialog catalog={data.catalog} />;
}

/** The templates list, reading groups + catalog from the dehydrated cache. */
export function TemplatesListContent() {
	const { data } = useSuspenseQuery(templatesQueryOptions);
	return <TemplatesList groups={data.groups} catalog={data.catalog} />;
}
