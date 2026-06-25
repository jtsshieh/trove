import type {
	BathroomBatch,
	BathroomProduct,
	BathroomType,
	BathroomVariant,
	Prisma,
} from '@/generated/prisma/client';
import { api } from '@/lib/api/client';

import type {
	AddBathroomBatchInput,
	BathroomScanSuggestion,
	CreateBathroomProductInput,
	CreateBathroomTypeInput,
	CreateBathroomVariantInput,
	EditBathroomProductInput,
	EditBathroomTypeInput,
	EditBathroomVariantInput,
	VariantStock,
} from './schemas';

/** A variant carrying the per-variant on-hand/state breakdown the fetcher computes. */
export type BathroomVariantWithStock = BathroomVariant & {
	stock: VariantStock;
};

/** A catalog product with its ordered variants (each with stock). */
export type BathroomProductWithVariants = BathroomProduct & {
	variants: BathroomVariantWithStock[];
};

/** A unit with its variant + product (for the nature stock tabs). */
export type BathroomUnitWithProduct = Prisma.BathroomUnitGetPayload<{
	include: { variant: { include: { product: true } } };
}>;

/** Client-side fetch functions for the bathroom resources. */

export const fetchBathroomProducts = () =>
	api.get<BathroomProductWithVariants[]>('/api/bathroom-products');

export const fetchBathroomUnits = () =>
	api.get<BathroomUnitWithProduct[]>('/api/bathroom-units');

export const fetchBathroomTypes = () =>
	api.get<BathroomType[]>('/api/bathroom-types');

export const createBathroomProduct = (input: CreateBathroomProductInput) =>
	api.post<BathroomProductWithVariants>('/api/bathroom-products', input);

export const editBathroomProduct = (
	id: string,
	input: EditBathroomProductInput,
) =>
	api.patch<BathroomProductWithVariants>(`/api/bathroom-products/${id}`, input);

export const deleteBathroomProduct = (id: string) =>
	api.del<{ ok: true }>(`/api/bathroom-products/${id}`);

/** Scan one uploaded photo and get suggested product fields (best-effort). */
export const scanBathroomImage = (imageKey: string) =>
	api.post<{ suggestion: BathroomScanSuggestion | null }>(
		'/api/bathroom-products/scan',
		{ imageKey },
	);

export const reorderBathroomProduct = (id: string, order: string) =>
	api.patch<{ ok: true }>(`/api/bathroom-products/${id}/order`, { order });

export const addBathroomVariant = (
	productId: string,
	input: CreateBathroomVariantInput,
) =>
	api.post<BathroomVariant>(
		`/api/bathroom-products/${productId}/variants`,
		input,
	);

export const editBathroomVariant = (
	id: string,
	input: EditBathroomVariantInput,
) => api.patch<BathroomVariant>(`/api/bathroom-variants/${id}`, input);

export const deleteBathroomVariant = (id: string) =>
	api.del<{ ok: true }>(`/api/bathroom-variants/${id}`);

export const reorderBathroomVariant = (id: string, order: string) =>
	api.patch<{ ok: true }>(`/api/bathroom-variants/${id}/order`, { order });

export const addBathroomBatch = (
	variantId: string,
	input: AddBathroomBatchInput,
) =>
	api.post<BathroomBatch>(`/api/bathroom-variants/${variantId}/batches`, input);

/** Retire one on-hand unit of a variant ("use one"). */
export const useOneBathroomVariant = (variantId: string) =>
	api.post<{ id: string }>(`/api/bathroom-variants/${variantId}/use`, {});

export const checkOutBathroomUnit = (id: string, tripId?: string | null) =>
	api.post<{ id: string }>(`/api/bathroom-units/${id}/check-out`, { tripId });

export const checkInBathroomUnit = (id: string) =>
	api.post<{ id: string }>(`/api/bathroom-units/${id}/check-in`, {});

export const endBathroomUnit = (id: string) =>
	api.post<{ id: string }>(`/api/bathroom-units/${id}/end`, {});

export const markBathroomUnitDirty = (id: string) =>
	api.post<{ id: string }>(`/api/bathroom-units/${id}/mark-dirty`, {});

export const markBathroomUnitWashed = (id: string) =>
	api.post<{ id: string }>(`/api/bathroom-units/${id}/mark-washed`, {});

export const createBathroomType = (input: CreateBathroomTypeInput) =>
	api.post<BathroomType>('/api/bathroom-types', input);

export const editBathroomType = (name: string, input: EditBathroomTypeInput) =>
	api.patch<BathroomType>(
		`/api/bathroom-types/${encodeURIComponent(name)}`,
		input,
	);

export const deleteBathroomType = (name: string) =>
	api.del<{ ok: true }>(`/api/bathroom-types/${encodeURIComponent(name)}`);
