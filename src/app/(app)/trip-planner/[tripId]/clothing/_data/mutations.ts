import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/api/errors';

import * as api from './api';
import { clothingBoardKeys } from './queries';
import type {
	AssignOutfitToDaysInput,
	CreateAdHocTripOutfitInput,
	DeleteClothingProvisionInput,
	UpsertTripDayNoteInput,
} from './schemas';

function onMutationError(error: unknown) {
	toast.error(error instanceof ApiError ? error.message : 'Something went wrong');
}

/** Refresh one trip's board (provisions, outfits, notes, closet, brings) after a write. */
function useInvalidateBoard(tripId: string) {
	const queryClient = useQueryClient();
	return () =>
		queryClient.invalidateQueries({
			queryKey: clothingBoardKeys.board(tripId),
		});
}

export function useAddClothingToDays(tripId: string) {
	const invalidate = useInvalidateBoard(tripId);
	return useMutation({
		mutationFn: (clothingId: string) =>
			api.addClothingToDays(tripId, clothingId),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useDeleteClothingProvision(tripId: string) {
	const invalidate = useInvalidateBoard(tripId);
	return useMutation({
		mutationFn: ({
			id,
			input,
		}: {
			id: string;
			input?: DeleteClothingProvisionInput;
		}) => api.deleteClothingProvision(id, input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useUpsertTripDayNote(tripId: string) {
	const invalidate = useInvalidateBoard(tripId);
	return useMutation({
		mutationFn: (input: UpsertTripDayNoteInput) =>
			api.upsertTripDayNote(tripId, input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useCreateAdHocTripOutfit(tripId: string) {
	const invalidate = useInvalidateBoard(tripId);
	return useMutation({
		mutationFn: (input: CreateAdHocTripOutfitInput) =>
			api.createAdHocTripOutfit(tripId, input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useRenameTripOutfit(tripId: string) {
	const invalidate = useInvalidateBoard(tripId);
	return useMutation({
		mutationFn: ({ id, name }: { id: string; name: string }) =>
			api.renameTripOutfit(id, name),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useDeleteTripOutfit(tripId: string) {
	const invalidate = useInvalidateBoard(tripId);
	return useMutation({
		mutationFn: (id: string) => api.deleteTripOutfit(id),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useSaveTripOutfitAsTemplate(tripId: string) {
	const invalidate = useInvalidateBoard(tripId);
	return useMutation({
		mutationFn: ({ id, name }: { id: string; name: string }) =>
			api.saveTripOutfitAsTemplate(id, name),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

/**
 * Assign a template onto trip days from the outfits library. The trip's board isn't
 * mounted there, so there's nothing to invalidate locally — the dialog just toasts.
 */
export function useAssignOutfitToDays() {
	return useMutation({
		mutationFn: ({
			tripId,
			input,
		}: {
			tripId: string;
			input: AssignOutfitToDaysInput;
		}) => api.assignOutfitToDays(tripId, input),
		onError: onMutationError,
	});
}
