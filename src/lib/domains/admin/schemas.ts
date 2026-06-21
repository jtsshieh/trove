import { z } from 'zod';

import { UserRole } from '@/generated/prisma/enums';

export const createUserSchema = z.object({
	username: z.string().min(1),
	password: z.string().min(8),
	role: z.nativeEnum(UserRole).default(UserRole.USER),
});

export const resetPasswordSchema = z.object({
	password: z.string().min(8),
});

export const setRoleSchema = z.object({
	role: z.nativeEnum(UserRole),
});

export const userIdParamSchema = z.object({
	id: z.string(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type SetRoleInput = z.infer<typeof setRoleSchema>;
