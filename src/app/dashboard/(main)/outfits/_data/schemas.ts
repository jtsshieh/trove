import { z } from 'zod';

export const createOutfitSchema = z.object({
	name: z.string().min(1),
	imageKey: z.string().optional(),
	clothingIds: z.array(z.string()).default([]),
});

export const editOutfitSchema = z.object({
	name: z.string().min(1).optional(),
	imageKey: z.string().nullish(),
});

/** Add one wardrobe piece to an outfit template (appended after its last item). */
export const addOutfitItemSchema = z.object({
	clothingId: z.string(),
});

/**
 * Drag-to-reorder an outfit in the library: the controlled board computes the new
 * lexorank from the outfit's final neighbours and sends it; the server just sets it.
 */
export const changeOutfitOrderSchema = z.object({
	order: z.string(),
});

export type CreateOutfitInput = z.infer<typeof createOutfitSchema>;
export type EditOutfitInput = z.infer<typeof editOutfitSchema>;
export type AddOutfitItemInput = z.infer<typeof addOutfitItemSchema>;
