import { api } from '@/lib/api/client';

import type { ContainerPackingBoard } from './fetchers';
import type {
	MarkClothingProvisionPackedInput,
	MarkEssentialProvisionPackedInput,
} from './schemas';

/** The board read payload. Type-only import — erased, so no server code leaks here. */
export type ContainerPackingBoardData = ContainerPackingBoard;

/** Every board write returns this result (mirrors the old actions). */
type MutationResult = { type: 'success'; message: string };

/** Client-side fetch functions for the trip container packing board. */

export const fetchContainerPackingBoard = (tripId: string) =>
	api.get<ContainerPackingBoardData>(`/api/trips/${tripId}/container-packing`);

export const markClothingProvisionPacked = (
	id: string,
	input: MarkClothingProvisionPackedInput,
) => api.patch<MutationResult>(`/api/clothing-provisions/${id}/packed`, input);

export const markEssentialProvisionPacked = (
	id: string,
	input: MarkEssentialProvisionPackedInput,
) => api.patch<MutationResult>(`/api/essential-provisions/${id}/packed`, input);
