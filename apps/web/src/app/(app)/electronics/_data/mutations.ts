import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/api/errors';
import { brandKeys } from '@/app/(app)/closet/clothing/brands/_data/queries';

import * as api from './api';
import { electronicsKeys } from './queries';
import type {
	CreateElectronicInput,
	CreateElectronicLinkInput,
	EditElectronicInput,
} from './schemas';

function onMutationError(error: unknown) {
	toast.error(error instanceof ApiError ? error.message : 'Something went wrong');
}

/** The electronics list reflects any electronic (or link) write. */
function useInvalidateElectronics() {
	const queryClient = useQueryClient();
	return () => {
		void queryClient.invalidateQueries({ queryKey: electronicsKeys.electronics });
		// A create/edit can tag a brand with domain=Electronics, so refresh the picker.
		void queryClient.invalidateQueries({ queryKey: brandKeys.all });
	};
}

export function useCreateElectronic() {
	const invalidate = useInvalidateElectronics();
	return useMutation({
		mutationFn: (input: CreateElectronicInput) => api.createElectronic(input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useEditElectronic() {
	const invalidate = useInvalidateElectronics();
	return useMutation({
		mutationFn: ({ id, input }: { id: string; input: EditElectronicInput }) =>
			api.editElectronic(id, input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useDeleteElectronic() {
	const invalidate = useInvalidateElectronics();
	return useMutation({
		mutationFn: (id: string) => api.deleteElectronic(id),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useCreateElectronicLink() {
	const invalidate = useInvalidateElectronics();
	return useMutation({
		mutationFn: (input: CreateElectronicLinkInput) =>
			api.createElectronicLink(input),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}

export function useDeleteElectronicLink() {
	const invalidate = useInvalidateElectronics();
	return useMutation({
		mutationFn: (id: string) => api.deleteElectronicLink(id),
		onSuccess: invalidate,
		onError: onMutationError,
	});
}
