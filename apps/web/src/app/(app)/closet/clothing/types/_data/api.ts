import type { PickerType } from '@/components/clothing-type-picker';
import { api } from '@/lib/api/client';

/** Client-side writes for the user's own clothing-type catalog. */

export const createClothingTypes = (types: PickerType[]) =>
	api.post<{ created: number }>('/api/clothing-types', { types });

export const deleteClothingType = (name: string) =>
	api.del<{ success: boolean }>(
		`/api/clothing-types/${encodeURIComponent(name)}`,
	);
