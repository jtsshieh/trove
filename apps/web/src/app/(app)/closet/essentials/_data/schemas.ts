import { EssentialCategory } from '@/generated/prisma/enums';
import { z } from 'zod';

export const createEssentialSchema = z.object({
	name: z.string(),
	category: z.enum([
		EssentialCategory.Toiletry,
		EssentialCategory.Document,
		EssentialCategory.Electronic,
	]),
	quantity: z.number().int().min(1).max(999).optional(),
	imageKey: z.string().nullish(),
});

export const editEssentialSchema = z.object({
	name: z.string().optional(),
	category: z
		.enum([
			EssentialCategory.Toiletry,
			EssentialCategory.Document,
			EssentialCategory.Electronic,
		])
		.optional(),
	quantity: z.number().int().min(1).max(999).optional(),
	imageKey: z.string().nullish(),
});

export const createEssentialGroupSchema = z.object({
	name: z.string().min(1),
	essentialIds: z.array(z.string()).min(1),
});

export const editEssentialGroupSchema = z.object({
	name: z.string().min(1).optional(),
	essentialIds: z.array(z.string()).min(1).optional(),
});

export const scanEssentialImageSchema = z.object({
	imageKey: z.string(),
});

/**
 * Bulk create from the essentials "Bulk add" flow. Each row is an independent
 * draft; the action creates them one-by-one and reports per-index failures so a
 * partial failure never loses the whole batch.
 */
export const createEssentialBatchSchema = z.object({
	items: z.array(createEssentialSchema).min(1),
});

export type CreateEssentialInput = z.infer<typeof createEssentialSchema>;
export type EditEssentialInput = z.infer<typeof editEssentialSchema>;
export type CreateEssentialGroupInput = z.infer<
	typeof createEssentialGroupSchema
>;
export type EditEssentialGroupInput = z.infer<typeof editEssentialGroupSchema>;

/** What the LLM scan returns to prefill the create form. All fields optional. */
export interface EssentialScanSuggestion {
	name?: string;
	category?: EssentialCategory;
}
