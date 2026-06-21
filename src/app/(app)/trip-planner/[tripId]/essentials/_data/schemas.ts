import { z } from 'zod';

import { EssentialCategory, ProvisionSection } from '@/generated/prisma/enums';

export const createEssentialProvisionsSchema = z.object({
	essentialIds: z.array(z.string()).min(1),
	section: z.nativeEnum(ProvisionSection).default(ProvisionSection.Universal),
	day: z.coerce.date().optional(),
	/** Place the new provisions directly inside a trip sub-group. */
	tripEssentialGroupId: z.string().nullish(),
});

/** Move a provision into/out of a sub-group (or just reorder) within its category. */
export const moveEssentialProvisionSchema = z.object({
	tripEssentialGroupId: z.string().nullish(),
	dayOrder: z.string(),
});

export const changeEssentialProvisionDayOrderSchema = z.object({
	dayOrder: z.string(),
});

export const createTripEssentialGroupSchema = z.object({
	name: z.string().min(1),
	category: z.nativeEnum(EssentialCategory),
});

export const renameTripEssentialGroupSchema = z.object({
	name: z.string().min(1),
});

export const importEssentialGroupSchema = z.object({
	groupId: z.string(),
});

export type CreateEssentialProvisionsInput = z.infer<
	typeof createEssentialProvisionsSchema
>;
/**
 * What the CLIENT sends: defaulted/coerced fields (section, day) are optional here
 * because the server fills them in during parse. Use for the api fetch fn param.
 */
export type CreateEssentialProvisionsBody = z.input<
	typeof createEssentialProvisionsSchema
>;
export type MoveEssentialProvisionInput = z.infer<
	typeof moveEssentialProvisionSchema
>;
export type ChangeEssentialProvisionDayOrderInput = z.infer<
	typeof changeEssentialProvisionDayOrderSchema
>;
export type CreateTripEssentialGroupInput = z.infer<
	typeof createTripEssentialGroupSchema
>;
export type RenameTripEssentialGroupInput = z.infer<
	typeof renameTripEssentialGroupSchema
>;
export type ImportEssentialGroupInput = z.infer<
	typeof importEssentialGroupSchema
>;
