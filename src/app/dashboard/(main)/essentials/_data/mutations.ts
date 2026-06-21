import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/api/errors';

import * as api from './api';
import { essentialsKeys } from './queries';
import type {
	CreateEssentialGroupInput,
	CreateEssentialInput,
	EditEssentialGroupInput,
	EditEssentialInput,
} from './schemas';

function onMutationError(error: unknown) {
	toast.error(error instanceof ApiError ? error.message : 'Something went wrong');
}

/** The essentials list reflects any essential write. */
function useInvalidateEssentials() {
	const queryClient = useQueryClient();
	return () => {
		void queryClient.invalidateQueries({ queryKey: essentialsKeys.essentials });
	};
}

/** The groups list reflects any group write. */
function useInvalidateGroups() {
	const queryClient = useQueryClient();
	return () => {
		void queryClient.invalidateQueries({ queryKey: essentialsKeys.groups });
	};
}

export function useCreateEssential() {
	const invalidate = useInvalidateEssentials();
	return useMutation({
		mutationFn: (input: CreateEssentialInput) => api.createEssential(input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useCreateEssentialBatch() {
	const invalidate = useInvalidateEssentials();
	return useMutation({
		mutationFn: (items: CreateEssentialInput[]) =>
			api.createEssentialBatch(items),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useEditEssential() {
	const invalidate = useInvalidateEssentials();
	return useMutation({
		mutationFn: ({ id, input }: { id: string; input: EditEssentialInput }) =>
			api.editEssential(id, input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useDeleteEssential() {
	const invalidate = useInvalidateEssentials();
	return useMutation({
		mutationFn: (id: string) => api.deleteEssential(id),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useCreateEssentialGroup() {
	const invalidate = useInvalidateGroups();
	return useMutation({
		mutationFn: (input: CreateEssentialGroupInput) =>
			api.createEssentialGroup(input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useEditEssentialGroup() {
	const invalidate = useInvalidateGroups();
	return useMutation({
		mutationFn: ({ id, input }: { id: string; input: EditEssentialGroupInput }) =>
			api.editEssentialGroup(id, input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useDeleteEssentialGroup() {
	const invalidate = useInvalidateGroups();
	return useMutation({
		mutationFn: (id: string) => api.deleteEssentialGroup(id),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}
