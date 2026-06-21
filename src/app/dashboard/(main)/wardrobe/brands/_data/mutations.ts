import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/api/errors';

import { wardrobeKeys } from '../../_data/queries';
import * as api from './api';
import { brandKeys } from './queries';
import type { EditBrandInput } from './schemas';

/** Toast helper shared by the brand mutations. */
function onMutationError(error: unknown) {
	toast.error(error instanceof ApiError ? error.message : 'Something went wrong');
}

/** Brands feed both the brands list and the wardrobe grid's brand options. */
function useInvalidateBrands() {
	const queryClient = useQueryClient();
	return () => {
		void queryClient.invalidateQueries({ queryKey: brandKeys.all });
		void queryClient.invalidateQueries({ queryKey: wardrobeKeys.clothingTypes });
	};
}

export function useCreateBrand() {
	const invalidate = useInvalidateBrands();
	return useMutation({
		mutationFn: api.createBrand,
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useEditBrand() {
	const invalidate = useInvalidateBrands();
	return useMutation({
		mutationFn: ({ name, input }: { name: string; input: EditBrandInput }) =>
			api.editBrand(name, input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useDeleteBrand() {
	const invalidate = useInvalidateBrands();
	return useMutation({
		mutationFn: (name: string) => api.deleteBrand(name),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}
