import { z } from 'zod';

import {
	BathroomForm,
	BathroomNature,
	BathroomUnitState,
} from '@/generated/prisma/enums';

/**
 * One variant of a bathroom product (e.g. a 250 mL bottle). `capacityMl` is the
 * canonical volume in milliliters — the dialog stores it via `parseVolumeInput`,
 * letting the user type in mL or fl oz. A variant with no recorded size is allowed.
 */
export const bathroomVariantInputSchema = z.object({
	label: z.string().nullish(),
	capacityMl: z.number().positive().nullish(),
});

export const createBathroomProductSchema = z.object({
	name: z.string().min(1),
	nature: z.enum([
		BathroomNature.Consumable,
		BathroomNature.Appliance,
		BathroomNature.Launderable,
	]),
	// Only meaningful for Consumables; the UI hides it otherwise and the form is
	// what drives TSA liquids compliance downstream.
	form: z
		.enum([
			BathroomForm.Liquid,
			BathroomForm.Gel,
			BathroomForm.Aerosol,
			BathroomForm.Cream,
			BathroomForm.Paste,
			BathroomForm.Powder,
		])
		.nullish(),
	notes: z.string().nullish(),
	type: z.string().nullish(),
	brand: z.string().nullish(),
	imageKey: z.string().nullish(),
	variants: z.array(bathroomVariantInputSchema).min(1),
});

export const editBathroomProductSchema = z.object({
	name: z.string().min(1).optional(),
	nature: z
		.enum([
			BathroomNature.Consumable,
			BathroomNature.Appliance,
			BathroomNature.Launderable,
		])
		.optional(),
	form: z
		.enum([
			BathroomForm.Liquid,
			BathroomForm.Gel,
			BathroomForm.Aerosol,
			BathroomForm.Cream,
			BathroomForm.Paste,
			BathroomForm.Powder,
		])
		.nullish(),
	notes: z.string().nullish(),
	type: z.string().nullish(),
	brand: z.string().nullish(),
	imageKey: z.string().nullish(),
});

/** Add a single variant to an existing product. */
export const createBathroomVariantSchema = bathroomVariantInputSchema;

export const editBathroomVariantSchema = z.object({
	label: z.string().nullish(),
	capacityMl: z.number().positive().nullish(),
});

/**
 * Drag-to-reorder a product or variant. The client (controlled @dnd-kit board)
 * computes the new lexorank from its final neighbours and sends it directly.
 */
export const changeBathroomOrderSchema = z.object({
	order: z.string(),
});

/**
 * Acquire a batch of a variant: creates the BathroomBatch AND inserts `quantity`
 * BathroomUnit rows (state = InStock) in one transaction.
 */
export const addBathroomBatchSchema = z.object({
	quantity: z.number().int().min(1).max(999),
	acquiredAt: z.date().optional(),
});

/** Check a unit out (optionally onto a trip). */
export const checkOutBathroomUnitSchema = z.object({
	tripId: z.string().nullish(),
});

/** LLM scan-to-fill: identify one product from a single uploaded image. */
export const scanBathroomImageSchema = z.object({
	imageKey: z.string(),
});

export const createBathroomTypeSchema = z.object({
	name: z.string().min(1),
});

export const editBathroomTypeSchema = z.object({
	name: z.string().min(1),
});

export type BathroomVariantInput = z.infer<typeof bathroomVariantInputSchema>;
export type CreateBathroomProductInput = z.infer<
	typeof createBathroomProductSchema
>;
export type EditBathroomProductInput = z.infer<
	typeof editBathroomProductSchema
>;
export type CreateBathroomVariantInput = z.infer<
	typeof createBathroomVariantSchema
>;
export type EditBathroomVariantInput = z.infer<
	typeof editBathroomVariantSchema
>;
export type AddBathroomBatchInput = z.infer<typeof addBathroomBatchSchema>;
export type CheckOutBathroomUnitInput = z.infer<
	typeof checkOutBathroomUnitSchema
>;
export type CreateBathroomTypeInput = z.infer<typeof createBathroomTypeSchema>;
export type EditBathroomTypeInput = z.infer<typeof editBathroomTypeSchema>;

/** What the LLM scan returns to prefill the create form. All fields optional. */
export interface BathroomScanSuggestion {
	name?: string;
	nature?: BathroomNature;
	form?: BathroomForm;
	type?: string;
	brand?: string;
}

/** Per-variant on-hand counts computed by the fetchers (non-Gone units). */
export interface VariantStock {
	onHand: number;
	inStock: number;
	inUse: number;
	dirty: number;
}

export const BATHROOM_UNIT_STATES = Object.values(BathroomUnitState);
