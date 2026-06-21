import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/api/errors';

import * as api from './api';
import { outfitKeys } from './queries';
import type {
	AddOutfitItemInput,
	CreateOutfitInput,
	EditOutfitInput,
} from './schemas';

function onMutationError(error: unknown) {
	toast.error(error instanceof ApiError ? error.message : 'Something went wrong');
}

/** Every outfit write reflects in the shared library query. */
function useInvalidateOutfits() {
	const queryClient = useQueryClient();
	return () => {
		void queryClient.invalidateQueries({ queryKey: outfitKeys.all });
	};
}

export function useCreateOutfit() {
	const invalidate = useInvalidateOutfits();
	return useMutation({
		mutationFn: (input: CreateOutfitInput) => api.createOutfit(input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useEditOutfit() {
	const invalidate = useInvalidateOutfits();
	return useMutation({
		mutationFn: ({ id, input }: { id: string; input: EditOutfitInput }) =>
			api.editOutfit(id, input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useDeleteOutfit() {
	const invalidate = useInvalidateOutfits();
	return useMutation({
		mutationFn: (id: string) => api.deleteOutfit(id),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useAddOutfitItem() {
	const invalidate = useInvalidateOutfits();
	return useMutation({
		mutationFn: ({ id, input }: { id: string; input: AddOutfitItemInput }) =>
			api.addOutfitItem(id, input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useRemoveOutfitItem() {
	const invalidate = useInvalidateOutfits();
	return useMutation({
		mutationFn: ({ id, clothingId }: { id: string; clothingId: string }) =>
			api.removeOutfitItem(id, clothingId),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}
