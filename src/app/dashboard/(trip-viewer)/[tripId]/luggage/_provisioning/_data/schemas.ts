import { z } from 'zod';

export const createLuggageProvisionSchema = z.object({
	luggageId: z.string(),
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

export type CreateLuggageProvisionInput = z.infer<
	typeof createLuggageProvisionSchema
>;
export type MoveContainerProvisionToLuggageInput = z.infer<
	typeof moveContainerProvisionToLuggageSchema
>;
