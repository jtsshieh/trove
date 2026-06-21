import type { PickerType } from '@/components/clothing-type-picker';
import { api } from '@/lib/api/client';

export const submitSetup = (username: string, password: string) =>
	api.post<{ success: boolean }>('/api/setup', { username, password });

export const createClothingTypes = (types: PickerType[]) =>
	api.post<{ created: number }>('/api/admin/clothing-types', { types });
