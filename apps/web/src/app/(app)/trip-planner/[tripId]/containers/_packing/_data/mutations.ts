import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/api/errors';

import * as api from './api';
import type { ContainerPackingBoardData } from './api';
import { containerPackingBoardKeys } from './queries';

function onMutationError(error: unknown) {
	toast.error(
		error instanceof ApiError ? error.message : 'Something went wrong',
	);
}

type ProvisionKind = 'clothing' | 'essential';

/** Flip one provision's `packed` flag in the cached board (optimistic update). */
function setProvisionPacked(
	board: ContainerPackingBoardData,
	kind: ProvisionKind,
	id: string,
	packed: boolean,
): ContainerPackingBoardData {
	return {
		...board,
		containerProvisions: board.containerProvisions.map((cp) => ({
			...cp,
			clothingProvisions:
				kind === 'clothing'
					? cp.clothingProvisions.map((p) =>
							p.id === id ? { ...p, packed } : p,
						)
					: cp.clothingProvisions,
			essentialProvisions:
				kind === 'essential'
					? cp.essentialProvisions.map((p) =>
							p.id === id ? { ...p, packed } : p,
						)
					: cp.essentialProvisions,
		})),
	};
}

/**
 * Toggle a provision's packed flag with an optimistic cache write. Toggles happen
 * in bursts (100+/day), so the checkbox flips instantly off the cache and the board
 * reconciles on settle. On error we roll the cache back and toast.
 */
function usePackedToggle(tripId: string, kind: ProvisionKind) {
	const queryClient = useQueryClient();
	const key = containerPackingBoardKeys.board(tripId);
	const fn =
		kind === 'clothing'
			? api.markClothingProvisionPacked
			: api.markEssentialProvisionPacked;

	return useMutation({
		mutationFn: ({ id, packed }: { id: string; packed: boolean }) =>
			fn(id, { packed }),
		onMutate: async ({ id, packed }) => {
			await queryClient.cancelQueries({ queryKey: key });
			const previous = queryClient.getQueryData<ContainerPackingBoardData>(key);
			if (previous) {
				queryClient.setQueryData<ContainerPackingBoardData>(
					key,
					setProvisionPacked(previous, kind, id, packed),
				);
			}
			return { previous };
		},
		onError: (error, _vars, context) => {
			if (context?.previous) queryClient.setQueryData(key, context.previous);
			onMutationError(error);
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
	});
}

export function useMarkClothingProvisionPacked(tripId: string) {
	return usePackedToggle(tripId, 'clothing');
}

export function useMarkEssentialProvisionPacked(tripId: string) {
	return usePackedToggle(tripId, 'essential');
}
