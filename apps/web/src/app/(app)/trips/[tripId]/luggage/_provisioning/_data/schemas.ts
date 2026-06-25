import { z } from 'zod';

import { LuggageKind } from '@/generated/prisma/enums';

export const createLuggageProvisionSchema = z.object({
	luggageId: z.string(),
	// How many of this suitcase to add to the trip (each is its own card / row).
	// Bounded server-side by how many the user still has free of that suitcase.
	count: z.number().int().min(1).max(99).optional(),
});

/**
 * One PATCH covers every container move on the board:
 * - `luggageProvisionId: null` removes it from its suitcase (back to the pool).
 * - a suitcase id + `luggageOrder` packs it into / reorders it within that suitcase.
 */
export const moveContainerProvisionToLuggageSchema = z.object({
	luggageProvisionId: z.string().nullable(),
	luggageOrder: z.string().nullable(),
});

/** Reorder a luggage provision (its card) within the trip's suitcases board. */
export const changeLuggageProvisionTripOrderSchema = z.object({
	tripOrder: z.string(),
});

/**
 * Set how this suitcase is checked in for the trip (CarryOn / Checked / Personal).
 * Only carry-on bags are evaluated for TSA 3-1-1 liquids compliance.
 */
export const setLuggageProvisionKindSchema = z.object({
	kind: z.nativeEnum(LuggageKind),
});

/**
 * One PATCH covers every direct (containerless) item move on the board:
 * - `luggageProvisionId: null` removes it from its suitcase (back to the pool).
 * - a suitcase id + `luggageOrder` packs it into / reorders it within that suitcase.
 */
export const moveProvisionToLuggageSchema = z.object({
	luggageProvisionId: z.string().nullable(),
	luggageOrder: z.string().nullable(),
});

export type CreateLuggageProvisionInput = z.infer<
	typeof createLuggageProvisionSchema
>;
export type MoveContainerProvisionToLuggageInput = z.infer<
	typeof moveContainerProvisionToLuggageSchema
>;
export type ChangeLuggageProvisionTripOrderInput = z.infer<
	typeof changeLuggageProvisionTripOrderSchema
>;
export type SetLuggageProvisionKindInput = z.infer<
	typeof setLuggageProvisionKindSchema
>;
export type MoveProvisionToLuggageInput = z.infer<
	typeof moveProvisionToLuggageSchema
>;
