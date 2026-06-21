import { z } from 'zod';

export const createContainerProvisionSchema = z.object({
	containerId: z.string(),
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

export type CreateContainerProvisionInput = z.infer<
	typeof createContainerProvisionSchema
>;
export type MoveProvisionToContainerInput = z.infer<
	typeof moveProvisionToContainerSchema
>;
export type ChangeProvisionContainerOrderInput = z.infer<
	typeof changeProvisionContainerOrderSchema
>;
