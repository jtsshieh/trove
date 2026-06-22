import { z } from 'zod';

export const createContainerProvisionSchema = z.object({
	containerId: z.string(),
	// How many of this container to add to the trip (each is its own card / row).
	// Bounded server-side by how many the user still has free of that container.
	count: z.number().int().min(1).max(99).optional(),
});

/** Drop a provision into a container at a specific position (the drag path). */
export const moveProvisionToContainerSchema = z.object({
	containerProvisionId: z.string(),
	containerOrder: z.string(),
});

/** Reorder a provision within its current container. */
export const changeProvisionContainerOrderSchema = z.object({
	containerOrder: z.string(),
});

/** Reorder a container provision (its card) within the trip's containers board. */
export const changeContainerProvisionTripOrderSchema = z.object({
	tripOrder: z.string(),
});

export type CreateContainerProvisionInput = z.infer<
	typeof createContainerProvisionSchema
>;
export type MoveProvisionToContainerInput = z.infer<
	typeof moveProvisionToContainerSchema
>;
export type ChangeProvisionContainerOrderInput = z.infer<
	typeof changeProvisionContainerOrderSchema
>;
export type ChangeContainerProvisionTripOrderInput = z.infer<
	typeof changeContainerProvisionTripOrderSchema
>;
