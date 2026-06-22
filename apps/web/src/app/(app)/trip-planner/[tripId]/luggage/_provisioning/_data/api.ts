import { api } from '@/lib/api/client';

import type { LuggageProvisioningBoardData } from './fetchers';
import type {
	CreateLuggageProvisionInput,
	MoveContainerProvisionToLuggageInput,
	MoveProvisionToLuggageInput,
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
) => api.post<MutationResult>(`/api/trips/${tripId}/luggage-provisions`, input);

export const deleteLuggageProvision = (id: string) =>
	api.del<MutationResult>(`/api/luggage-provisions/${id}`);

export const changeLuggageProvisionTripOrder = (
	id: string,
	tripOrder: string,
) =>
	api.patch<MutationResult>(`/api/luggage-provisions/${id}/order`, {
		tripOrder,
	});

export const moveContainerProvisionToLuggage = (
	id: string,
	input: MoveContainerProvisionToLuggageInput,
) =>
	api.patch<MutationResult>(`/api/container-provisions/${id}/luggage`, input);

export const moveClothingProvisionToLuggage = (
	id: string,
	input: MoveProvisionToLuggageInput,
) => api.patch<MutationResult>(`/api/clothing-provisions/${id}/luggage`, input);

export const moveEssentialProvisionToLuggage = (
	id: string,
	input: MoveProvisionToLuggageInput,
) =>
	api.patch<MutationResult>(`/api/essential-provisions/${id}/luggage`, input);
