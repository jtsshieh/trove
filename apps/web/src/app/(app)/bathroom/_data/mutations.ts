import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/api/errors';

import * as api from './api';
import { bathroomKeys } from './queries';
import type {
	AddBathroomBatchInput,
	CreateBathroomProductInput,
	CreateBathroomVariantInput,
	EditBathroomProductInput,
	EditBathroomVariantInput,
} from './schemas';

function onMutationError(error: unknown) {
	toast.error(error instanceof ApiError ? error.message : 'Something went wrong');
}

/** The catalog reflects any product/variant write. */
function useInvalidateProducts() {
	const queryClient = useQueryClient();
	return () => {
		void queryClient.invalidateQueries({ queryKey: bathroomKeys.products });
	};
}

/** The types list + brand picker reflect any type write. */
function useInvalidateTypes() {
	const queryClient = useQueryClient();
	return () => {
		void queryClient.invalidateQueries({ queryKey: bathroomKeys.types });
		void queryClient.invalidateQueries({ queryKey: bathroomKeys.products });
	};
}

/**
 * Stock-changing actions (buy/use/dirty/wash/end) move units between states AND
 * change per-variant on-hand counts, so they invalidate BOTH the units board (the
 * nature tabs) and the products catalog (whose per-variant stock reads those counts).
 */
function useInvalidateStock() {
	const queryClient = useQueryClient();
	return () => {
		void queryClient.invalidateQueries({ queryKey: bathroomKeys.units });
		void queryClient.invalidateQueries({ queryKey: bathroomKeys.products });
	};
}

export function useCreateBathroomProduct() {
	const invalidate = useInvalidateProducts();
	return useMutation({
		mutationFn: (input: CreateBathroomProductInput) =>
			api.createBathroomProduct(input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useEditBathroomProduct() {
	const invalidate = useInvalidateProducts();
	return useMutation({
		mutationFn: ({
			id,
			input,
		}: {
			id: string;
			input: EditBathroomProductInput;
		}) => api.editBathroomProduct(id, input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useDeleteBathroomProduct() {
	const invalidate = useInvalidateProducts();
	return useMutation({
		mutationFn: (id: string) => api.deleteBathroomProduct(id),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useAddBathroomVariant() {
	const invalidate = useInvalidateProducts();
	return useMutation({
		mutationFn: ({
			productId,
			input,
		}: {
			productId: string;
			input: CreateBathroomVariantInput;
		}) => api.addBathroomVariant(productId, input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useEditBathroomVariant() {
	const invalidate = useInvalidateProducts();
	return useMutation({
		mutationFn: ({
			id,
			input,
		}: {
			id: string;
			input: EditBathroomVariantInput;
		}) => api.editBathroomVariant(id, input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useDeleteBathroomVariant() {
	const invalidate = useInvalidateProducts();
	return useMutation({
		mutationFn: (id: string) => api.deleteBathroomVariant(id),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useAddBathroomBatch() {
	const invalidate = useInvalidateStock();
	return useMutation({
		mutationFn: ({
			variantId,
			input,
		}: {
			variantId: string;
			input: AddBathroomBatchInput;
		}) => api.addBathroomBatch(variantId, input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

/** "Use one" of a variant — retires a single on-hand unit (drops on-hand by one). */
export function useUseOneBathroomVariant() {
	const invalidate = useInvalidateStock();
	return useMutation({
		mutationFn: (variantId: string) => api.useOneBathroomVariant(variantId),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useCheckOutBathroomUnit() {
	const invalidate = useInvalidateStock();
	return useMutation({
		mutationFn: ({ id, tripId }: { id: string; tripId?: string | null }) =>
			api.checkOutBathroomUnit(id, tripId),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useCheckInBathroomUnit() {
	const invalidate = useInvalidateStock();
	return useMutation({
		mutationFn: (id: string) => api.checkInBathroomUnit(id),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useEndBathroomUnit() {
	const invalidate = useInvalidateStock();
	return useMutation({
		mutationFn: (id: string) => api.endBathroomUnit(id),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useMarkBathroomUnitDirty() {
	const invalidate = useInvalidateStock();
	return useMutation({
		mutationFn: (id: string) => api.markBathroomUnitDirty(id),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useMarkBathroomUnitWashed() {
	const invalidate = useInvalidateStock();
	return useMutation({
		mutationFn: (id: string) => api.markBathroomUnitWashed(id),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useCreateBathroomType() {
	const invalidate = useInvalidateTypes();
	return useMutation({
		mutationFn: api.createBathroomType,
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useEditBathroomType() {
	const invalidate = useInvalidateTypes();
	return useMutation({
		mutationFn: ({
			name,
			input,
		}: {
			name: string;
			input: { name: string };
		}) => api.editBathroomType(name, input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useDeleteBathroomType() {
	const invalidate = useInvalidateTypes();
	return useMutation({
		mutationFn: (name: string) => api.deleteBathroomType(name),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}
