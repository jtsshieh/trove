import { ContainerType } from '@/generated/prisma/enums';
import { z } from 'zod';

export const createContainerSchema = z.object({
	name: z.string(),
	type: z.enum([ContainerType.Clothes, ContainerType.Essentials]),
});

export const editContainerSchema = z.object({
	name: z.string().optional(),
	type: z.enum([ContainerType.Clothes, ContainerType.Essentials]).optional(),
	order: z.string().optional(),
});
