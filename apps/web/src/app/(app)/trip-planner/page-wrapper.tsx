'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import React from 'react';

import { tripsQueryOptions } from '@/app/(app)/trip-planner/[tripId]/_data/queries';
import { TripList } from './trip-list';

export function TripListContent() {
	const { data: trips } = useSuspenseQuery(tripsQueryOptions);
	return <TripList trips={trips} />;
}
