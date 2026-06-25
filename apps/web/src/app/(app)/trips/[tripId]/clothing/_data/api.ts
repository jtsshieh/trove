import { api } from '@/lib/api/client';

import type { ClothingBoardData } from './fetchers';
import type {
	AssignOutfitToDaysInput,
	CreateAdHocTripOutfitInput,
	CreateClothingProvisionsInput,
	DeleteClothingProvisionInput,
	MoveClothingProvisionInput,
	MoveTripOutfitToDayInput,
	SetClothingBringingInput,
	UpsertTripDayNoteInput,
} from './schemas';

/** The board read payload. Type-only import — erased, so no server code leaks here. */
export type ClothingBoard = ClothingBoardData;

/** Every board write returns this discriminated result (mirrors the old actions). */
type MutationResult =
	| { type: 'success'; message: string }
	| { type: 'error'; message: string }
	| { type: 'warning'; message: string; count: number };

/** Client-side fetch functions for the trip clothing board. */

export const fetchClothingBoard = (tripId: string) =>
	api.get<ClothingBoard>(`/api/trips/${tripId}/clothing-board`);

export const createClothingProvisions = (
	tripId: string,
	input: CreateClothingProvisionsInput,
) =>
	api.post<MutationResult>(`/api/trips/${tripId}/clothing-provisions`, input);

export const addClothingToDays = (tripId: string, clothingId: string) =>
	api.post<MutationResult>(`/api/trips/${tripId}/clothing-provisions/spread`, {
		clothingId,
	});

export const moveClothingProvision = (
	id: string,
	input: MoveClothingProvisionInput,
) => api.patch<MutationResult>(`/api/clothing-provisions/${id}/move`, input);

export const changeClothingProvisionDayOrder = (id: string, dayOrder: string) =>
	api.patch<MutationResult>(`/api/clothing-provisions/${id}/order`, {
		dayOrder,
	});

export const deleteClothingProvision = (
	id: string,
	input?: DeleteClothingProvisionInput,
) => api.del<MutationResult>(`/api/clothing-provisions/${id}`, input);

export const setClothingBringing = (
	tripId: string,
	input: SetClothingBringingInput,
) => api.put<MutationResult>(`/api/trips/${tripId}/clothing-brings`, input);

export const upsertTripDayNote = (
	tripId: string,
	input: UpsertTripDayNoteInput,
) => api.put<MutationResult>(`/api/trips/${tripId}/day-notes`, input);

export const assignOutfitToDays = (
	tripId: string,
	input: AssignOutfitToDaysInput,
) => api.post<MutationResult>(`/api/trips/${tripId}/trip-outfits`, input);

export const createAdHocTripOutfit = (
	tripId: string,
	input: CreateAdHocTripOutfitInput,
) => api.post<MutationResult>(`/api/trips/${tripId}/trip-outfits`, input);

export const renameTripOutfit = (id: string, name: string) =>
	api.patch<MutationResult>(`/api/trip-outfits/${id}`, { name });

export const moveTripOutfitToDay = (
	id: string,
	input: MoveTripOutfitToDayInput,
) => api.patch<MutationResult>(`/api/trip-outfits/${id}/move`, input);

export const changeTripOutfitOrder = (id: string, order: string) =>
	api.patch<MutationResult>(`/api/trip-outfits/${id}/order`, { order });

export const deleteTripOutfit = (id: string) =>
	api.del<MutationResult>(`/api/trip-outfits/${id}`);

export const saveTripOutfitAsTemplate = (id: string, name: string) =>
	api.post<MutationResult>(`/api/trip-outfits/${id}/save-as-template`, {
		name,
	});
