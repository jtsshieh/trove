import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/api/errors';

import * as api from './api';
import { essentialsBoardKeys } from './queries';
import type {
	CreateEssentialProvisionsBody,
	CreateTripEssentialGroupInput,
	ImportEssentialGroupInput,
	RenameTripEssentialGroupInput,
} from './schemas';

function onMutationError(error: unknown) {
	toast.error(error instanceof ApiError ? error.message : 'Something went wrong');
}

/** Refresh one trip's board (provisions, sub-groups, closet, groups) after a write. */
function useInvalidateBoard(tripId: string) {
	const queryClient = useQueryClient();
	return () =>
		queryClient.invalidateQueries({
			queryKey: essentialsBoardKeys.board(tripId),
		});
}

export function useCreateEssentialProvisions(tripId: string) {
	const invalidate = useInvalidateBoard(tripId);
	return useMutation({
		mutationFn: (input: CreateEssentialProvisionsBody) =>
			api.createEssentialProvisions(tripId, input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useDeleteEssentialProvision(tripId: string) {
	const invalidate = useInvalidateBoard(tripId);
	return useMutation({
		mutationFn: (id: string) => api.deleteEssentialProvision(id),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useCreateTripEssentialGroup(tripId: string) {
	const invalidate = useInvalidateBoard(tripId);
	return useMutation({
		mutationFn: (input: CreateTripEssentialGroupInput) =>
			api.createTripEssentialGroup(tripId, input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useRenameTripEssentialGroup(tripId: string) {
	const invalidate = useInvalidateBoard(tripId);
	return useMutation({
		mutationFn: ({
			id,
			input,
		}: {
			id: string;
			input: RenameTripEssentialGroupInput;
		}) => api.renameTripEssentialGroup(id, input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useDeleteTripEssentialGroup(tripId: string) {
	const invalidate = useInvalidateBoard(tripId);
	return useMutation({
		mutationFn: (id: string) => api.deleteTripEssentialGroup(id),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

/**
 * Import a premade group. The picker surfaces its own success/warning/error toasts
 * (and resets per-row pending state), so there's no `onError` here — the caller
 * catches. The board still refetches on success.
 */
export function useImportEssentialGroup(tripId: string) {
	const invalidate = useInvalidateBoard(tripId);
	return useMutation({
		mutationFn: (input: ImportEssentialGroupInput) =>
			api.importEssentialGroup(tripId, input),
		onSuccess: invalidate,
	});
}
