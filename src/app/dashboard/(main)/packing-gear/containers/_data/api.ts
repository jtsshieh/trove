import type { Container } from '@/generated/prisma/client';
import { api } from '@/lib/api/client';

import type {
	ContainerScanSuggestion,
	CreateContainerInput,
	EditContainerInput,
} from './schemas';

/** Client-side fetch functions for the container resource. */

export const fetchContainers = () => api.get<Container[]>('/api/containers');

export const createContainer = (input: CreateContainerInput) =>
	api.post<Container>('/api/containers', input);

export const editContainer = (id: string, input: EditContainerInput) =>
	api.patch<Container>(`/api/containers/${id}`, input);

export const deleteContainer = (id: string) =>
	api.del<{ ok: true }>(`/api/containers/${id}`);

export const reorderContainer = (id: string, order: string) =>
	api.patch<{ ok: true }>(`/api/containers/${id}/order`, { order });

export const scanContainerImage = (imageKey: string) =>
	api.post<{ suggestion: ContainerScanSuggestion | null }>('/api/containers/scan', {
		imageKey,
	});
