import type { Brand } from '@/generated/prisma/client';
import { api } from '@/lib/api/client';

import type { CreateBrandInput, EditBrandInput } from './schemas';

/** Client-side fetch functions for the brands resource. */

export const fetchBrands = () => api.get<Brand[]>('/api/brands');

export const createBrand = (input: CreateBrandInput) =>
	api.post<Brand>('/api/brands', input);

export const editBrand = (name: string, input: EditBrandInput) =>
	api.patch<Brand>(`/api/brands/${encodeURIComponent(name)}`, input);

export const deleteBrand = (name: string) =>
	api.del<{ ok: true }>(`/api/brands/${encodeURIComponent(name)}`);
