import { z } from 'zod';

import {
	DisplayMode,
	PieceSize,
	ProvisionView,
	VolumeUnit,
} from '@/generated/prisma/enums';

export const updateUserSettingsSchema = z.object({
	displayMode: z.nativeEnum(DisplayMode).optional(),
	defaultProvisionView: z.nativeEnum(ProvisionView).optional(),
	pieceSize: z.nativeEnum(PieceSize).optional(),
	volumeUnit: z.nativeEnum(VolumeUnit).optional(),
});

export const changeUsernameSchema = z.object({
	username: z.string(),
});

export const createUserSchema = z.object({
	username: z.string(),
	password: z.string(),
});

export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;
