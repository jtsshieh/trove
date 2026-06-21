import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/api/errors';

import * as api from './api';
import { containerBoardKeys } from './queries';
import type { CreateContainerProvisionInput } from './schemas';

function onMutationError(error: unknown) {
	toast.error(error instanceof ApiError ? error.message : 'Something went wrong');
}

/** Refresh one trip's board (pool, containers, available catalog) after a write. */
function useInvalidateBoard(tripId: string) {
	const queryClient = useQueryClient();
	return () =>
		queryClient.invalidateQueries({
			queryKey: containerBoardKeys.board(tripId),
		});
}

export function useCreateContainerProvision(tripId: string) {
	const invalidate = useInvalidateBoard(tripId);
	return useMutation({
		mutationFn: (input: CreateContainerProvisionInput) =>
			api.createContainerProvision(tripId, input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useDeleteContainerProvision(tripId: string) {
	const invalidate = useInvalidateBoard(tripId);
	return useMutation({
		mutationFn: (id: string) => api.deleteContainerProvision(id),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}
