import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/api/errors';

import * as api from './api';
import { containerKeys } from './queries';
import type { CreateContainerInput, EditContainerInput } from './schemas';

function onMutationError(error: unknown) {
	toast.error(error instanceof ApiError ? error.message : 'Something went wrong');
}

function useInvalidateContainers() {
	const queryClient = useQueryClient();
	return () => {
		void queryClient.invalidateQueries({ queryKey: containerKeys.all });
	};
}

export function useCreateContainer() {
	const invalidate = useInvalidateContainers();
	return useMutation({
		mutationFn: (input: CreateContainerInput) => api.createContainer(input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useEditContainer() {
	const invalidate = useInvalidateContainers();
	return useMutation({
		mutationFn: ({ id, input }: { id: string; input: EditContainerInput }) =>
			api.editContainer(id, input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useDeleteContainer() {
	const invalidate = useInvalidateContainers();
	return useMutation({
		mutationFn: (id: string) => api.deleteContainer(id),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}
