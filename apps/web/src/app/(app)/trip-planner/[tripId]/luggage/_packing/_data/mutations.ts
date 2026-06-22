import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/api/errors';

import * as api from './api';
import { luggagePackingBoardKeys } from './queries';
import type { MarkContainerPackedInput } from './schemas';

function onMutationError(error: unknown) {
	toast.error(
		error instanceof ApiError ? error.message : 'Something went wrong',
	);
}

/** Refresh one trip's luggage packing board (suitcases + container packed state) after a write. */
function useInvalidateBoard(tripId: string) {
	const queryClient = useQueryClient();
	return () =>
		queryClient.invalidateQueries({
			queryKey: luggagePackingBoardKeys.board(tripId),
		});
}

export function useMarkContainerPacked(tripId: string) {
	const invalidate = useInvalidateBoard(tripId);
	return useMutation({
		mutationFn: ({
			id,
			input,
		}: {
			id: string;
			input: MarkContainerPackedInput;
		}) => api.markContainerPacked(id, input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

/** Toggle a direct (containerless) clothing item's packed flag in its suitcase. */
export function useMarkClothingPacked(tripId: string) {
	const invalidate = useInvalidateBoard(tripId);
	return useMutation({
		mutationFn: ({ id, packed }: { id: string; packed: boolean }) =>
			api.markClothingPacked(id, { packed }),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

/** Toggle a direct (containerless) essential's packed flag in its suitcase. */
export function useMarkEssentialPacked(tripId: string) {
	const invalidate = useInvalidateBoard(tripId);
	return useMutation({
		mutationFn: ({ id, packed }: { id: string; packed: boolean }) =>
			api.markEssentialPacked(id, { packed }),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}
