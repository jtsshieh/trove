import { api } from '@/lib/api/client';

import type { EssentialsBoardData } from './fetchers';
import type {
	CreateEssentialProvisionsBody,
	CreateTripEssentialGroupInput,
	ImportEssentialGroupInput,
	MoveEssentialProvisionInput,
	RenameTripEssentialGroupInput,
} from './schemas';

/** The board read payload. Type-only import — erased, so no server code leaks here. */
export type EssentialsBoard = EssentialsBoardData;

/** Every board write returns this discriminated result (mirrors the old actions). */
type MutationResult =
	| { type: 'success'; message: string }
	| { type: 'warning'; message: string }
	| { type: 'error'; message: string };

/** Client-side fetch functions for the trip essentials board. */

export const fetchEssentialsBoard = (tripId: string) =>
	api.get<EssentialsBoard>(`/api/trips/${tripId}/essential-board`);

export const createEssentialProvisions = (
	tripId: string,
	input: CreateEssentialProvisionsBody,
) =>
	api.post<MutationResult>(`/api/trips/${tripId}/essential-provisions`, input);

export const moveEssentialProvision = (
	id: string,
	input: MoveEssentialProvisionInput,
) => api.patch<MutationResult>(`/api/essential-provisions/${id}/move`, input);

export const changeEssentialProvisionDayOrder = (
	id: string,
	dayOrder: string,
) =>
	api.patch<MutationResult>(`/api/essential-provisions/${id}/order`, {
		dayOrder,
	});

export const deleteEssentialProvision = (id: string) =>
	api.del<MutationResult>(`/api/essential-provisions/${id}`);

export const createTripEssentialGroup = (
	tripId: string,
	input: CreateTripEssentialGroupInput,
) => api.post<MutationResult>(`/api/trips/${tripId}/essential-groups`, input);

export const importEssentialGroup = (
	tripId: string,
	input: ImportEssentialGroupInput,
) =>
	api.post<MutationResult>(
		`/api/trips/${tripId}/essential-groups/import`,
		input,
	);

export const renameTripEssentialGroup = (
	id: string,
	input: RenameTripEssentialGroupInput,
) => api.patch<MutationResult>(`/api/trip-essential-groups/${id}`, input);

export const deleteTripEssentialGroup = (id: string) =>
	api.del<MutationResult>(`/api/trip-essential-groups/${id}`);
