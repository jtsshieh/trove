import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/api/errors';

import * as api from './api';
import { documentsKeys } from './queries';
import type { CreateDocumentInput, EditDocumentInput } from './schemas';

function onMutationError(error: unknown) {
	toast.error(error instanceof ApiError ? error.message : 'Something went wrong');
}

/** The documents list reflects any document write. */
function useInvalidateDocuments() {
	const queryClient = useQueryClient();
	return () => {
		void queryClient.invalidateQueries({ queryKey: documentsKeys.all });
	};
}

export function useCreateDocument() {
	const invalidate = useInvalidateDocuments();
	return useMutation({
		mutationFn: (input: CreateDocumentInput) => api.createDocument(input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useEditDocument() {
	const invalidate = useInvalidateDocuments();
	return useMutation({
		mutationFn: ({ id, input }: { id: string; input: EditDocumentInput }) =>
			api.editDocument(id, input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useDeleteDocument() {
	const invalidate = useInvalidateDocuments();
	return useMutation({
		mutationFn: (id: string) => api.deleteDocument(id),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}
