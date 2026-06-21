import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/api/errors';

import * as api from './api';
import { wardrobeKeys } from './queries';
import type { CreateClothingInput, EditClothingInput } from './schemas';

function onMutationError(error: unknown) {
	toast.error(error instanceof ApiError ? error.message : 'Something went wrong');
}

/** Both the wardrobe grid (types) and the flat clothing list reflect any write. */
function useInvalidateClothing() {
	const queryClient = useQueryClient();
	return () => {
		void queryClient.invalidateQueries({ queryKey: wardrobeKeys.clothing });
		void queryClient.invalidateQueries({ queryKey: wardrobeKeys.clothingTypes });
	};
}

export function useCreateClothing() {
	const invalidate = useInvalidateClothing();
	return useMutation({
		mutationFn: (input: CreateClothingInput) => api.createClothing(input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useCreateClothingBatch() {
	const invalidate = useInvalidateClothing();
	return useMutation({
		mutationFn: (items: CreateClothingInput[]) => api.createClothingBatch(items),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useEditClothing() {
	const invalidate = useInvalidateClothing();
	return useMutation({
		mutationFn: ({ id, input }: { id: string; input: EditClothingInput }) =>
			api.editClothing(id, input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useDeleteClothing() {
	const invalidate = useInvalidateClothing();
	return useMutation({
		mutationFn: (id: string) => api.deleteClothing(id),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

