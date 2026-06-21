import type { Clothing, Prisma } from '@/generated/prisma/client';
import { api } from '@/lib/api/client';

import type {
	ClothingScanSuggestion,
	CreateClothingInput,
	EditClothingInput,
} from './schemas';

/** The wardrobe grid payload: a clothing type with its (ordered) pieces. */
export type ClothingTypeWithClothes = Prisma.ClothingTypeGetPayload<{
	include: { clothes: true };
}>;

/** Client-side fetch functions for the clothing resource. */

export const fetchClothes = () => api.get<Clothing[]>('/api/clothing');

export const fetchClothingTypes = () =>
	api.get<ClothingTypeWithClothes[]>('/api/clothing-types');

export const createClothing = (input: CreateClothingInput) =>
	api.post<Clothing>('/api/clothing', input);

export const createClothingBatch = (items: CreateClothingInput[]) =>
	api.post<{ created: number; failed: number[] }>('/api/clothing/batch', {
		items,
	});

export const editClothing = (id: string, input: EditClothingInput) =>
	api.patch<Clothing>(`/api/clothing/${id}`, input);

export const deleteClothing = (id: string) =>
	api.del<{ ok: true }>(`/api/clothing/${id}`);

export const reorderClothing = (id: string, order: string) =>
	api.patch<{ ok: true }>(`/api/clothing/${id}/order`, { order });

export const scanClothingImage = (imageKey: string) =>
	api.post<{ suggestion: ClothingScanSuggestion | null }>('/api/clothing/scan', {
		imageKey,
	});
