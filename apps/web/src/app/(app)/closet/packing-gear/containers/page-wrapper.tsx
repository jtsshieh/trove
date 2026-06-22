'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

import { containersQueryOptions } from './_data/queries';
import { ContainerList } from './container-list';

/**
 * The data-dependent grid only. The page's static toolbar (description + Add
 * buttons) renders immediately; this streams under its own Suspense boundary,
 * reading the dehydrated cache via useSuspenseQuery.
 */
export function ContainerGrid() {
	const { data: containers } = useSuspenseQuery(containersQueryOptions);
	return <ContainerList containers={containers} />;
}
