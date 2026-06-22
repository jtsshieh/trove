import { api } from '@/lib/api/client';

import type { ContainerBoardData } from './fetchers';
import type {
	CreateContainerProvisionInput,
	MoveProvisionToContainerInput,
} from './schemas';

/** The board read payload. Type-only import — erased, so no server code leaks here. */
export type ContainerBoard = ContainerBoardData;

/** Every board write returns this discriminated result (mirrors the old actions). */
type MutationResult = { type: 'success'; message: string };

/** Client-side fetch functions for the containers provisioning board. */

export const fetchContainerBoard = (tripId: string) =>
	api.get<ContainerBoard>(`/api/trips/${tripId}/container-board`);

export const createContainerProvision = (
	tripId: string,
	input: CreateContainerProvisionInput,
) =>
	api.post<MutationResult>(`/api/trips/${tripId}/container-provisions`, input);

export const deleteContainerProvision = (id: string) =>
	api.del<MutationResult>(`/api/container-provisions/${id}`);

export const moveClothingProvisionToContainer = (
	id: string,
	input: MoveProvisionToContainerInput,
) =>
	api.patch<MutationResult>(`/api/clothing-provisions/${id}/container`, input);

export const changeClothingProvisionContainerOrder = (
	id: string,
	containerOrder: string,
) =>
	api.patch<MutationResult>(`/api/clothing-provisions/${id}/container/order`, {
		containerOrder,
	});

export const deleteClothingProvisionFromContainer = (id: string) =>
	api.del<MutationResult>(`/api/clothing-provisions/${id}/container`);

export const moveEssentialProvisionToContainer = (
	id: string,
	input: MoveProvisionToContainerInput,
) =>
	api.patch<MutationResult>(`/api/essential-provisions/${id}/container`, input);

export const changeEssentialProvisionContainerOrder = (
	id: string,
	containerOrder: string,
) =>
	api.patch<MutationResult>(`/api/essential-provisions/${id}/container/order`, {
		containerOrder,
	});

export const deleteEssentialProvisionFromContainer = (id: string) =>
	api.del<MutationResult>(`/api/essential-provisions/${id}/container`);
