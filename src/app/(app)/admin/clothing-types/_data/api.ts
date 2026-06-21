import type { PickerType } from '@/components/clothing-type-picker';
import { api } from '@/lib/api/client';

export const createClothingTypes = (types: PickerType[]) =>
	api.post<{ created: number }>('/api/admin/clothing-types', { types });

export const deleteClothingType = (name: string) =>
	api.del<{ success: boolean }>(
		`/api/admin/clothing-types/${encodeURIComponent(name)}`,
	);
