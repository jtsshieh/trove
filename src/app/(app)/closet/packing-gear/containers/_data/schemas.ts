import { ContainerType } from '@/generated/prisma/enums';
import { z } from 'zod';

export const createContainerSchema = z.object({
	name: z.string(),
	type: z.enum([ContainerType.Clothes, ContainerType.Essentials]),
	quantity: z.number().int().min(1).max(999).optional(),
	imageKey: z.string().nullish(),
});

export const editContainerSchema = z.object({
	name: z.string().optional(),
	type: z.enum([ContainerType.Clothes, ContainerType.Essentials]).optional(),
	quantity: z.number().int().min(1).max(999).optional(),
	imageKey: z.string().nullish(),
});

export const scanContainerImageSchema = z.object({
	imageKey: z.string(),
});

/**
 * Drag-to-reorder a container. The client (controlled @dnd-kit board) computes the
 * new lexorank from the container's final neighbours and sends it directly.
 */
export const changeContainerOrderSchema = z.object({
	order: z.string(),
});

export type CreateContainerInput = z.infer<typeof createContainerSchema>;
export type EditContainerInput = z.infer<typeof editContainerSchema>;
export type ScanContainerImageInput = z.infer<typeof scanContainerImageSchema>;

/** What the LLM scan returns to prefill the create form. All fields optional. */
export interface ContainerScanSuggestion {
	name?: string;
	type?: string;
}
