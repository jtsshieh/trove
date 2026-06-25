import type { Electronic, ElectronicLink, Prisma } from '@/generated/prisma/client';
import { api } from '@/lib/api/client';

import type {
	CreateElectronicInput,
	CreateElectronicLinkInput,
	EditElectronicInput,
	ElectronicScanSuggestion,
} from './schemas';

/**
 * An electronic with its brand plus both sides of the accessory associations, so a
 * card can show the linked items (devices ↔ their accessories).
 */
export type ElectronicWithLinks = Prisma.ElectronicGetPayload<{
	include: {
		brand: true;
		asDevice: { include: { accessory: true } };
		asAccessory: { include: { device: true } };
	};
}>;

/** Client-side fetch functions for the electronics + electronic-links resources. */

export const fetchElectronics = () =>
	api.get<ElectronicWithLinks[]>('/api/electronics');

export const createElectronic = (input: CreateElectronicInput) =>
	api.post<Electronic>('/api/electronics', input);

export const editElectronic = (id: string, input: EditElectronicInput) =>
	api.patch<Electronic>(`/api/electronics/${id}`, input);

export const deleteElectronic = (id: string) =>
	api.del<{ ok: true }>(`/api/electronics/${id}`);

export const reorderElectronic = (id: string, order: string) =>
	api.patch<{ ok: true }>(`/api/electronics/${id}/order`, { order });

export const createElectronicLink = (input: CreateElectronicLinkInput) =>
	api.post<ElectronicLink>('/api/electronic-links', input);

export const deleteElectronicLink = (id: string) =>
	api.del<{ ok: true }>(`/api/electronic-links/${id}`);

export const scanElectronicImage = (imageKey: string) =>
	api.post<{ suggestion: ElectronicScanSuggestion | null }>(
		'/api/electronics/scan',
		{ imageKey },
	);
