import { z } from 'zod';

export const markClothingProvisionPackedSchema = z.object({
	packed: z.boolean(),
});

export const markEssentialProvisionPackedSchema = z.object({
	packed: z.boolean(),
});

export type MarkClothingProvisionPackedInput = z.infer<
	typeof markClothingProvisionPackedSchema
>;
export type MarkEssentialProvisionPackedInput = z.infer<
	typeof markEssentialProvisionPackedSchema
>;
