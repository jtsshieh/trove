import type { Outfit } from '@/generated/prisma/client';
import { api } from '@/lib/api/client';

import type { OutfitWithItems } from './fetchers';
import type {
	AddOutfitItemInput,
	CreateOutfitInput,
	EditOutfitInput,
} from './schemas';

/** Client-side fetch functions for the outfits resource. */

export const fetchOutfits = () => api.get<OutfitWithItems[]>('/api/outfits');

export const createOutfit = (input: CreateOutfitInput) =>
	api.post<Outfit>('/api/outfits', input);

export const editOutfit = (id: string, input: EditOutfitInput) =>
	api.patch<Outfit>(`/api/outfits/${id}`, input);

export const deleteOutfit = (id: string) =>
	api.del<{ ok: true }>(`/api/outfits/${id}`);

export const reorderOutfit = (id: string, order: string) =>
	api.patch<{ ok: true }>(`/api/outfits/${id}/order`, { order });

export const addOutfitItem = (id: string, input: AddOutfitItemInput) =>
	api.post<{ ok: true }>(`/api/outfits/${id}/items`, input);

export const removeOutfitItem = (id: string, clothingId: string) =>
	api.del<{ ok: true }>(`/api/outfits/${id}/items/${clothingId}`);
