import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/api/errors';

import * as api from './api';
import { luggageKeys } from './queries';
import type { CreateLuggageInput, EditLuggageInput } from './schemas';

function onMutationError(error: unknown) {
	toast.error(error instanceof ApiError ? error.message : 'Something went wrong');
}

function useInvalidateLuggage() {
	const queryClient = useQueryClient();
	return () => {
		void queryClient.invalidateQueries({ queryKey: luggageKeys.luggage });
	};
}

export function useCreateLuggage() {
	const invalidate = useInvalidateLuggage();
	return useMutation({
		mutationFn: (input: CreateLuggageInput) => api.createLuggage(input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useEditLuggage() {
	const invalidate = useInvalidateLuggage();
	return useMutation({
		mutationFn: ({ id, input }: { id: string; input: EditLuggageInput }) =>
			api.editLuggage(id, input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useDeleteLuggage() {
	const invalidate = useInvalidateLuggage();
	return useMutation({
		mutationFn: (id: string) => api.deleteLuggage(id),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}
