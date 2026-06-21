import { z } from 'zod';

export const markContainerPackedSchema = z.object({
	packed: z.boolean(),
});

export type MarkContainerPackedInput = z.infer<
	typeof markContainerPackedSchema
>;
