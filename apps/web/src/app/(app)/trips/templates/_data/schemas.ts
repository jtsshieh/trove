import { z } from 'zod';

import { EssentialKind } from '@/generated/prisma/enums';

/**
 * Reusable Essential-group templates are item-polymorphic, exactly like trip
 * provisions: each picked item names its source app via `kind` and the polymorphic
 * FK value via `itemId` (a bathroom variant / electronic / document id). The service
 * spreads these through `essentialItemFk(kind, itemId)` to build the group items.
 */
export const essentialItemPickSchema = z.object({
	kind: z.nativeEnum(EssentialKind),
	itemId: z.string(),
});

export const createEssentialGroupSchema = z.object({
	name: z.string().min(1),
	items: z.array(essentialItemPickSchema).min(1),
});

export const editEssentialGroupSchema = z.object({
	name: z.string().min(1).optional(),
	items: z.array(essentialItemPickSchema).min(1).optional(),
});

export type EssentialItemPick = z.infer<typeof essentialItemPickSchema>;
export type CreateEssentialGroupInput = z.infer<
	typeof createEssentialGroupSchema
>;
export type EditEssentialGroupInput = z.infer<typeof editEssentialGroupSchema>;
