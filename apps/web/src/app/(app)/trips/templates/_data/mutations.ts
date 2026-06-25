import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/api/errors';

import * as api from './api';
import { templatesKeys } from './queries';
import type {
	CreateEssentialGroupInput,
	EditEssentialGroupInput,
} from './schemas';

function onMutationError(error: unknown) {
	toast.error(
		error instanceof ApiError ? error.message : 'Something went wrong',
	);
}

/** The templates list reflects any group write. */
function useInvalidateTemplates() {
	const queryClient = useQueryClient();
	return () => {
		void queryClient.invalidateQueries({ queryKey: templatesKeys.all });
	};
}

export function useCreateEssentialGroup() {
	const invalidate = useInvalidateTemplates();
	return useMutation({
		mutationFn: (input: CreateEssentialGroupInput) =>
			api.createEssentialGroup(input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useEditEssentialGroup() {
	const invalidate = useInvalidateTemplates();
	return useMutation({
		mutationFn: ({ id, input }: { id: string; input: EditEssentialGroupInput }) =>
			api.editEssentialGroup(id, input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useDeleteEssentialGroup() {
	const invalidate = useInvalidateTemplates();
	return useMutation({
		mutationFn: (id: string) => api.deleteEssentialGroup(id),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}
