import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/api/errors';

import * as api from './api';
import { luggageBoardKeys } from './queries';
import type {
	CreateLuggageProvisionInput,
	SetLuggageProvisionKindInput,
} from './schemas';

function onMutationError(error: unknown) {
	toast.error(
		error instanceof ApiError ? error.message : 'Something went wrong',
	);
}

/** Refresh one trip's suitcases board (provisions + available suitcases) after a write. */
function useInvalidateBoard(tripId: string) {
	const queryClient = useQueryClient();
	return () =>
		queryClient.invalidateQueries({
			queryKey: luggageBoardKeys.board(tripId),
		});
}

export function useCreateLuggageProvision(tripId: string) {
	const invalidate = useInvalidateBoard(tripId);
	return useMutation({
		mutationFn: (input: CreateLuggageProvisionInput) =>
			api.createLuggageProvision(tripId, input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useDeleteLuggageProvision(tripId: string) {
	const invalidate = useInvalidateBoard(tripId);
	return useMutation({
		mutationFn: (id: string) => api.deleteLuggageProvision(id),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useSetLuggageProvisionKind(tripId: string) {
	const invalidate = useInvalidateBoard(tripId);
	return useMutation({
		mutationFn: ({
			id,
			input,
		}: {
			id: string;
			input: SetLuggageProvisionKindInput;
		}) => api.setLuggageProvisionKind(id, input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}
