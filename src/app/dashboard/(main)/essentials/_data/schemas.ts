import { EssentialCategory } from '@/generated/prisma/enums';
import { z } from 'zod';

export const createEssentialSchema = z.object({
	name: z.string(),
	category: z.enum([
		EssentialCategory.Toiletry,
		EssentialCategory.Document,
		EssentialCategory.Electronic,
	]),
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
});
