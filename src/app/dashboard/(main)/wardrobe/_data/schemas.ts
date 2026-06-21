import { z } from 'zod';

export const createClothingSchema = z.object({
	brandLine: z.string().optional(),
	color: z.string(),
	modifier: z.string().optional(),
	quantity: z.number().int().min(1).max(999).optional(),

	type: z.string(),
	typeCategory: z.enum(['Top', 'Bottom', 'Accessory']).optional(),
	brand: z.string(),

	imageKey: z.string().nullish(),
});

export const editClothingSchema = z.object({
	brandLine: z.string().optional(),
	color: z.string().optional(),
	modifier: z.string().optional(),
	quantity: z.number().int().min(1).max(999).optional(),

	type: z.string().optional(),
	typeCategory: z.enum(['Top', 'Bottom', 'Accessory']).optional(),
	brand: z.string().optional(),

	imageKey: z.string().nullish(),
});

export const scanClothingImageSchema = z.object({
	imageKey: z.string(),
});

/**
 * Drag-to-reorder a wardrobe piece. The client (controlled @dnd-kit board) computes
 * the new lexorank from the piece's final neighbours and sends it directly.
 */
export const changeClothingOrderSchema = z.object({
	order: z.string(),
});

/**
 * Bulk create from the wardrobe "Bulk add" flow. Each row is an independent draft;
 * the action creates them one-by-one and reports per-index failures so a partial
 * failure never loses the whole batch.
 */
export const createClothingBatchSchema = z.object({
	items: z.array(createClothingSchema).min(1),
});

export type CreateClothingInput = z.infer<typeof createClothingSchema>;
export type EditClothingInput = z.infer<typeof editClothingSchema>;

/** What the LLM scan returns to prefill the create form. All fields optional. */
export interface ClothingScanSuggestion {
	type?: string;
	typeCategory?: 'Top' | 'Bottom' | 'Accessory';
	brand?: string;
	color?: string;
	brandLine?: string;
	modifier?: string;
}
