import { ElectronicKind } from '@/generated/prisma/enums';
import { z } from 'zod';

export const createElectronicSchema = z.object({
	name: z.string().min(1, 'Enter a name'),
	kind: z.enum([
		ElectronicKind.Device,
		ElectronicKind.Cable,
		ElectronicKind.PowerBank,
		ElectronicKind.Accessory,
	]),
	brand: z.string().optional(),
	model: z.string().optional(),
	serialNumber: z.string().optional(),
	acquiredAt: z.date().nullish(),
	quantity: z.number().int().min(1).max(999).optional(),
	notes: z.string().optional(),
	imageKey: z.string().nullish(),
});

export const editElectronicSchema = z.object({
	name: z.string().optional(),
	kind: z
		.enum([
			ElectronicKind.Device,
			ElectronicKind.Cable,
			ElectronicKind.PowerBank,
			ElectronicKind.Accessory,
		])
		.optional(),
	brand: z.string().optional(),
	model: z.string().optional(),
	serialNumber: z.string().optional(),
	acquiredAt: z.date().nullish(),
	quantity: z.number().int().min(1).max(999).optional(),
	notes: z.string().optional(),
	imageKey: z.string().nullish(),
});

/**
 * Drag-to-reorder an electronic. The client (controlled @dnd-kit board) computes
 * the new lexorank from the electronic's final neighbours and sends it directly.
 */
export const changeElectronicOrderSchema = z.object({
	order: z.string(),
});

/** Body for the LLM scan-to-fill route: the uploaded image's storage key. */
export const scanElectronicImageSchema = z.object({
	imageKey: z.string(),
});

/** Associate an accessory with a device — iPad ↔ Apple Pencil / Magic Keyboard. */
export const createElectronicLinkSchema = z.object({
	deviceId: z.string(),
	accessoryId: z.string(),
});

export type CreateElectronicInput = z.infer<typeof createElectronicSchema>;
export type EditElectronicInput = z.infer<typeof editElectronicSchema>;
export type CreateElectronicLinkInput = z.infer<
	typeof createElectronicLinkSchema
>;

/** What the LLM scan returns to prefill the create/edit form. All fields optional. */
export interface ElectronicScanSuggestion {
	name?: string;
	kind?: 'Device' | 'Cable' | 'PowerBank' | 'Accessory';
	brand?: string;
	model?: string;
}
