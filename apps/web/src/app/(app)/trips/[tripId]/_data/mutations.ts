import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/api/errors';

import * as api from './api';
import type { CreateTripInput, EditTripInput } from './schemas';

function onMutationError(error: unknown) {
	toast.error(
		error instanceof ApiError ? error.message : 'Something went wrong',
	);
}

/** Every trip write refreshes the trips list. */
function useInvalidateTrips() {
	const queryClient = useQueryClient();
	return () => {
		void queryClient.invalidateQueries({ queryKey: ['trips'] });
	};
}

export function useCreateTrip() {
	const invalidate = useInvalidateTrips();
	return useMutation({
		mutationFn: (input: CreateTripInput) => api.createTrip(input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useEditTrip() {
	const invalidate = useInvalidateTrips();
	return useMutation({
		mutationFn: ({ id, input }: { id: string; input: EditTripInput }) =>
			api.editTrip(id, input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useDeleteTrip() {
	const invalidate = useInvalidateTrips();
	return useMutation({
		mutationFn: (id: string) => api.deleteTrip(id),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}
