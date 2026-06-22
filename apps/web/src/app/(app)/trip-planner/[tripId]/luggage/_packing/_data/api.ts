import { api } from '@/lib/api/client';

import type { LuggagePackingBoard as LuggagePackingBoardData } from './fetchers';
import type { MarkContainerPackedInput } from './schemas';

/** The board read payload. Type-only import — erased, so no server code leaks here. */
export type LuggagePackingBoard = LuggagePackingBoardData;

/** Every board write returns this discriminated result (mirrors the old actions). */
type MutationResult = { type: 'success'; message: string };

/** Client-side fetch functions for the trip luggage packing board. */

export const fetchLuggagePackingBoard = (tripId: string) =>
	api.get<LuggagePackingBoard>(`/api/trips/${tripId}/luggage-packing`);

export const markContainerPacked = (
	id: string,
	input: MarkContainerPackedInput,
) => api.patch<MutationResult>(`/api/container-provisions/${id}/packed`, input);

/** Toggle a direct (containerless) clothing item's packed flag inside its suitcase. */
export const markClothingPacked = (id: string, input: { packed: boolean }) =>
	api.patch<MutationResult>(`/api/clothing-provisions/${id}/packed`, input);

/** Toggle a direct (containerless) essential's packed flag inside its suitcase. */
export const markEssentialPacked = (id: string, input: { packed: boolean }) =>
	api.patch<MutationResult>(`/api/essential-provisions/${id}/packed`, input);
