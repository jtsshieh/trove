import { z } from 'zod';

import { ClothingCategory } from '@/generated/prisma/enums';

export const clothingTypeInputSchema = z.object({
	name: z.string().min(1),
	category: z.nativeEnum(ClothingCategory),
});

export const createClothingTypesSchema = z.object({
	types: z.array(clothingTypeInputSchema).min(1),
});

export const clothingTypeNameParamSchema = z.object({
	name: z.string().min(1),
});

export type ClothingTypeInput = z.infer<typeof clothingTypeInputSchema>;
export type CreateClothingTypesInput = z.infer<
	typeof createClothingTypesSchema
>;
