import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/api/errors';

import * as api from './api';
import { systemKeys } from './queries';

function onMutationError(error: unknown) {
	toast.error(
		error instanceof ApiError ? error.message : 'Something went wrong',
	);
}

export function useCheckForUpdate() {
	return useMutation({
		mutationFn: api.checkForUpdate,
		onError: onMutationError,
	});
}

export function useTriggerUpdate() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: api.triggerUpdate,
		onSuccess: () => {
			// Status now reads 'updating'; the polling status query takes over from here.
			void queryClient.invalidateQueries({ queryKey: systemKeys.status });
		},
		onError: onMutationError,
	});
}
