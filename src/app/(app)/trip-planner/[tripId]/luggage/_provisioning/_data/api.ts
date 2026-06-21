import { api } from '@/lib/api/client';

import type { LuggageProvisioningBoardData } from './fetchers';
import type {
	CreateLuggageProvisionInput,
	MoveContainerProvisionToLuggageInput,
} from './schemas';

/** The board read payload. Type-only import — erased, so no server code leaks here. */
export type LuggageProvisioningBoard = LuggageProvisioningBoardData;

/** Every board write returns this discriminated result (mirrors the old actions). */
type MutationResult = { type: 'success'; message: string };

/** Client-side fetch functions for the trip suitcases board. */

export const fetchLuggageBoard = (tripId: string) =>
	api.get<LuggageProvisioningBoard>(`/api/trips/${tripId}/luggage-board`);

export const createLuggageProvision = (
	tripId: string,
	input: CreateLuggageProvisionInput,
) =>
	api.post<MutationResult>(`/api/trips/${tripId}/luggage-provisions`, input);

export const deleteLuggageProvision = (id: string) =>
	api.del<MutationResult>(`/api/luggage-provisions/${id}`);

export const moveContainerProvisionToLuggage = (
	id: string,
	input: MoveContainerProvisionToLuggageInput,
) => api.patch<MutationResult>(`/api/container-provisions/${id}/luggage`, input);
