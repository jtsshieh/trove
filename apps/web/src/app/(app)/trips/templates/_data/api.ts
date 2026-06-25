import { api } from '@/lib/api/client';

import type { getAllEssentialGroups } from './fetchers';
import type { TemplatesPageData } from './fetchers';
import type {
	CreateEssentialGroupInput,
	EditEssentialGroupInput,
} from './schemas';

/**
 * An essential-group template with its (ordered) polymorphic items resolved. Derived
 * from the fetcher so the include shape (via `essentialItemInclude`) stays in lock-step.
 */
export type EssentialGroupWithItems = Awaited<
	ReturnType<typeof getAllEssentialGroups>
>[number];

/** The full templates payload (groups + the item catalog). */
export type TemplatesData = TemplatesPageData;

/** Client-side fetch functions for the essential-group templates resource. */

export const fetchTemplatesData = () =>
	api.get<TemplatesData>('/api/essential-groups');

export const createEssentialGroup = (input: CreateEssentialGroupInput) =>
	api.post<{ id: string }>('/api/essential-groups', input);

export const editEssentialGroup = (
	id: string,
	input: EditEssentialGroupInput,
) => api.patch<{ ok: true }>(`/api/essential-groups/${id}`, input);

export const deleteEssentialGroup = (id: string) =>
	api.del<{ ok: true }>(`/api/essential-groups/${id}`);
