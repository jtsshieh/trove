'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

import { luggageQueryOptions } from './_data/queries';
import { LuggageList } from './luggage-list';

/**
 * The data-dependent grid only. The page's static toolbar (description + Add
 * buttons) renders immediately; this streams under its own Suspense boundary,
 * reading the dehydrated cache via useSuspenseQuery.
 */
export function LuggageGrid() {
	const { data: luggage } = useSuspenseQuery(luggageQueryOptions);
	return <LuggageList luggage={luggage} />;
}
