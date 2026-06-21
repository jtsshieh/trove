import type { PickerType } from '@/components/clothing-type-picker';
import { api } from '@/lib/api/client';

export const submitSetup = (username: string, password: string) =>
	api.post<{ success: boolean }>('/api/setup', { username, password });

// The admin is signed in after step 1, so this seeds the admin's OWN per-user types.
export const createClothingTypes = (types: PickerType[]) =>
	api.post<{ created: number }>('/api/clothing-types', { types });
