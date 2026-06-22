import type { Trip } from '@/generated/prisma/client';
import type { TripMode } from '@/generated/prisma/enums';
import { api } from '@/lib/api/client';

import type { CreateTripInput, EditTripInput } from './schemas';

/** Client-side fetch functions for the trips resource. */

export const fetchTrips = () => api.get<Trip[]>('/api/trips');

export const changeTripMode = (id: string, mode: TripMode) =>
	api.patch<Trip>(`/api/trips/${id}/mode`, { mode });

export const createTrip = (input: CreateTripInput) =>
	api.post<Trip>('/api/trips', input);

export const editTrip = (id: string, input: EditTripInput) =>
	api.patch<Trip>(`/api/trips/${id}`, input);

export const deleteTrip = (id: string) =>
	api.del<{ ok: true }>(`/api/trips/${id}`);
