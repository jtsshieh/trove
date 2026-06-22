import type { Luggage } from '@/generated/prisma/client';
import { api } from '@/lib/api/client';

import type {
	CreateLuggageInput,
	EditLuggageInput,
	LuggageScanSuggestion,
} from './schemas';

/** Client-side fetch functions for the luggage resource. */

export const fetchLuggage = () => api.get<Luggage[]>('/api/luggage');

export const createLuggage = (input: CreateLuggageInput) =>
	api.post<Luggage>('/api/luggage', input);

export const editLuggage = (id: string, input: EditLuggageInput) =>
	api.patch<Luggage>(`/api/luggage/${id}`, input);

export const deleteLuggage = (id: string) =>
	api.del<{ ok: true }>(`/api/luggage/${id}`);

export const reorderLuggage = (id: string, order: string) =>
	api.patch<{ ok: true }>(`/api/luggage/${id}/order`, { order });

export const scanLuggageImage = (imageKey: string) =>
	api.post<{ suggestion: LuggageScanSuggestion | null }>('/api/luggage/scan', {
		imageKey,
	});
