import { z } from 'zod';

import { ProvisionSection } from '@/generated/prisma/enums';

export const createClothingProvisionsSchema = z.object({
	clothingIds: z.array(z.string()).min(1),
	section: z.nativeEnum(ProvisionSection).default(ProvisionSection.Day),
	day: z.coerce.date().optional(),
	// Set when dropping a closet piece directly INTO an outfit on a day.
	tripOutfitId: z.string().nullish(),
});

export const moveClothingProvisionSchema = z.object({
	section: z.nativeEnum(ProvisionSection),
	day: z.coerce.date().nullish(),
	tripOutfitId: z.string().nullish(),
	dayOrder: z.string(),
});

export const changeClothingProvisionDayOrderSchema = z.object({
	dayOrder: z.string(),
});

export const deleteClothingProvisionSchema = z.object({
	force: z.boolean().optional(),
});

export const setClothingBringingSchema = z.object({
	clothingId: z.string(),
	bringing: z.number().int().min(0).max(999),
});

export const addClothingToDaysSchema = z.object({
	clothingId: z.string(),
});

export const upsertTripDayNoteSchema = z.object({
	day: z.coerce.date(),
	note: z.string(),
});

export const assignOutfitToDaysSchema = z.object({
	outfitId: z.string(),
	days: z.array(z.coerce.date()).min(1),
});

export const createAdHocTripOutfitSchema = z.object({
	day: z.coerce.date(),
	name: z.string().optional(),
	clothingProvisionIds: z.array(z.string()).optional(),
});

export const renameTripOutfitSchema = z.object({
	name: z.string(),
});

export const moveTripOutfitToDaySchema = z.object({
	day: z.coerce.date(),
});

export const saveTripOutfitAsTemplateSchema = z.object({
	name: z.string().min(1),
});

export type CreateClothingProvisionsInput = z.infer<
	typeof createClothingProvisionsSchema
>;
export type MoveClothingProvisionInput = z.infer<
	typeof moveClothingProvisionSchema
>;
export type ChangeClothingProvisionDayOrderInput = z.infer<
	typeof changeClothingProvisionDayOrderSchema
>;
export type DeleteClothingProvisionInput = z.infer<
	typeof deleteClothingProvisionSchema
>;
export type SetClothingBringingInput = z.infer<
	typeof setClothingBringingSchema
>;
export type AddClothingToDaysInput = z.infer<typeof addClothingToDaysSchema>;
export type UpsertTripDayNoteInput = z.infer<typeof upsertTripDayNoteSchema>;
export type AssignOutfitToDaysInput = z.infer<typeof assignOutfitToDaysSchema>;
export type CreateAdHocTripOutfitInput = z.infer<
	typeof createAdHocTripOutfitSchema
>;
export type RenameTripOutfitInput = z.infer<typeof renameTripOutfitSchema>;
export type MoveTripOutfitToDayInput = z.infer<
	typeof moveTripOutfitToDaySchema
>;
export type SaveTripOutfitAsTemplateInput = z.infer<
	typeof saveTripOutfitAsTemplateSchema
>;
