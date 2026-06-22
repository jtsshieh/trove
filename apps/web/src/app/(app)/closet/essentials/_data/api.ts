import type { Essential, Prisma } from '@/generated/prisma/client';
import { api } from '@/lib/api/client';

import type {
	CreateEssentialGroupInput,
	CreateEssentialInput,
	EditEssentialGroupInput,
	EditEssentialInput,
	EssentialScanSuggestion,
} from './schemas';

/** An essential group with its (ordered) items, each carrying its essential. */
export type EssentialGroupWithItems = Prisma.EssentialGroupGetPayload<{
	include: { items: { include: { essential: true } } };
}>;

/** Client-side fetch functions for the essentials + essential-groups resources. */

export const fetchEssentials = () => api.get<Essential[]>('/api/essentials');

export const fetchEssentialGroups = () =>
	api.get<EssentialGroupWithItems[]>('/api/essential-groups');

export const createEssential = (input: CreateEssentialInput) =>
	api.post<Essential>('/api/essentials', input);

export const createEssentialBatch = (items: CreateEssentialInput[]) =>
	api.post<{ created: number; failed: number[] }>('/api/essentials/batch', {
		items,
	});

export const editEssential = (id: string, input: EditEssentialInput) =>
	api.patch<Essential>(`/api/essentials/${id}`, input);

export const deleteEssential = (id: string) =>
	api.del<{ ok: true }>(`/api/essentials/${id}`);

export const reorderEssential = (id: string, order: string) =>
	api.patch<{ ok: true }>(`/api/essentials/${id}/order`, { order });

export const scanEssentialImage = (imageKey: string) =>
	api.post<{ suggestion: EssentialScanSuggestion | null }>(
		'/api/essentials/scan',
		{ imageKey },
	);

export const createEssentialGroup = (input: CreateEssentialGroupInput) =>
	api.post<{ id: string }>('/api/essential-groups', input);

export const editEssentialGroup = (
	id: string,
	input: EditEssentialGroupInput,
) => api.patch<{ ok: true }>(`/api/essential-groups/${id}`, input);

export const deleteEssentialGroup = (id: string) =>
	api.del<{ ok: true }>(`/api/essential-groups/${id}`);
