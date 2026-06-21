import { z } from 'zod';

export const createBrandSchema = z.object({
	name: z.string(),
});

export const editBrandSchema = z.object({
	name: z.string().optional(),
});

export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type EditBrandInput = z.infer<typeof editBrandSchema>;
