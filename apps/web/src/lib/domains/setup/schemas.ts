import { z } from 'zod';

export const setupSchema = z.object({
	username: z.string().min(1),
	password: z.string().min(8),
});

export type SetupInput = z.infer<typeof setupSchema>;
