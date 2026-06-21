import { z } from 'zod';

export const createLuggageSchema = z.object({
	name: z.string(),
	quantity: z.number().int().min(1).max(999).optional(),
	imageKey: z.string().nullish(),
});

export const editLuggageSchema = z.object({
	name: z.string().optional(),
	quantity: z.number().int().min(1).max(999).optional(),
	imageKey: z.string().nullish(),
});

export const scanLuggageImageSchema = z.object({
	imageKey: z.string(),
});

/**
 * Drag-to-reorder a luggage piece. The client (controlled @dnd-kit board) computes
 * the new lexorank from the piece's final neighbours and sends it directly.
 */
export const changeLuggageOrderSchema = z.object({
	order: z.string(),
});

export type CreateLuggageInput = z.infer<typeof createLuggageSchema>;
export type EditLuggageInput = z.infer<typeof editLuggageSchema>;
export type ScanLuggageImageInput = z.infer<typeof scanLuggageImageSchema>;

/** What the LLM scan returns to prefill the create form. All fields optional. */
export interface LuggageScanSuggestion {
	name?: string;
}
