'use server';

import { LexoRank } from 'lexorank';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { authenticatedActionClient } from '../../../../../../../lib/action-client';
import { prisma } from '../../../../../../../lib/db.server';
import {
	clothingProvisionClient,
	containerProvisionClient,
	essentialProvisionClient,
	tripClient,
} from '../../../_data/clients';
import { createContainerProvisionSchema } from './schemas';

export const createContainerProvision = tripClient
	.metadata({ actionName: 'createContainerProvision' })
	.inputSchema(createContainerProvisionSchema)
	.bindArgsSchemas<[tripId: z.ZodString]>([z.string()])
	.action(
		async ({
			parsedInput: { containerId },
			bindArgsParsedInputs: [tripId],
			ctx: { user },
		}) => {
			const container = await prisma.container.findUnique({
				where: { id: containerId },
			});
			if (container?.userId !== user.id) throw new Error('Unauthorized');

			await prisma.containerProvision.create({
				data: {
					trip: { connect: { id: tripId } },
					container: { connect: { id: containerId } },
				},
			});

			revalidatePath(`/dashboard/${tripId}/containers`);

			return {
				type: 'success',
				message: 'Packing gear provision successfully added',
			};
		},
	);

export const deleteContainerProvision = containerProvisionClient
	.metadata({ actionName: 'deleteContainerProvision' })
	.bindArgsSchemas<[provisionId: z.ZodString]>([z.string()])
	.action(
		async ({
			bindArgsParsedInputs: [provisionId],
			ctx: { containerProvision },
		}) => {
			await prisma.containerProvision.delete({
				where: { id: provisionId },
			});

			revalidatePath(`/dashboard/${containerProvision.tripId}/containers`);

			return {
				type: 'success',
				message: 'Packing gear provision successfully removed',
			};
		},
	);

const addDeleteClothingProvisionContainerSchema = z.tuple([
	z.string(),
	z.string(),
]);
const clothingProvisionContainerClient = authenticatedActionClient.use(
	async ({ next, bindArgsClientInputs, ctx: { user } }) => {
		const [containerProvisionId, clothingProvisionId] =
			addDeleteClothingProvisionContainerSchema.parse(bindArgsClientInputs);

		const provision = await prisma.clothingProvision.findUnique({
			where: { id: clothingProvisionId },
			include: { trip: true, clothing: true },
		});
		if (!provision) throw new Error('Not found');

		if (provision.trip.userId !== user.id) throw new Error('Unauthorized');
		if (provision.clothing.userId !== user.id) throw new Error('Unauthorized');

		const containerProvision = await prisma.containerProvision.findUnique({
			where: { id: containerProvisionId },
			include: { container: true },
		});
		if (!containerProvision) throw new Error('Not found');
		if (containerProvision.container.userId !== user.id)
			throw new Error('Unauthorized');

		return next({ ctx: { provision } });
	},
);

export const addClothingProvisionToContainer = clothingProvisionContainerClient
	.metadata({ actionName: 'moveClothingProvisionToContainer' })
	.bindArgsSchemas<
		[containerProvisionId: z.ZodString, clothingProvisionId: z.ZodString]
	>([z.string(), z.string()])
	.action(
		async ({
			bindArgsParsedInputs: [containerProvisionId, clothingProvisionId],
			ctx: { provision },
		}) => {
			const lastClothingProvision = await prisma.clothingProvision.findFirst({
				where: { containerProvisionId },
				orderBy: { containerOrder: 'desc' },
			});

			const order = lastClothingProvision
				? LexoRank.parse(lastClothingProvision.containerOrder!).genNext()
				: LexoRank.middle();

			await prisma.clothingProvision.update({
				where: { id: clothingProvisionId },
				data: {
					containerOrder: order.toString(),
					containerProvision: {
						connect: { id: containerProvisionId },
					},
				},
			});

			revalidatePath(`/dashboard/${provision.tripId}/containers`);

			return {
				type: 'success',
				message: 'Packing gear provision successfully updated',
			};
		},
	);
export const changeClothingProvisionContainerOrder = clothingProvisionClient
	.metadata({ actionName: 'changeClothingProvisionContainerOrder' })
	.bindArgsSchemas<[clothingProvisionId: z.ZodString, newOrder: z.ZodString]>([
		z.string(),
		z.string(),
	])
	.action(
		async ({
			bindArgsParsedInputs: [provisionId, newOrder],
			ctx: { clothingProvision },
		}) => {
			await prisma.clothingProvision.update({
				where: { id: provisionId },
				data: { containerOrder: newOrder.toString() },
			});

			revalidatePath(`/dashboard/${clothingProvision.tripId}/containers`);

			return {
				type: 'success',
				message: 'Clothing provision successfully edited',
			};
		},
	);

export const deleteClothingProvisionFromContainer =
	clothingProvisionContainerClient
		.metadata({ actionName: 'deleteClothingProvisionFromContainer' })
		.bindArgsSchemas<
			[containerProvisionId: z.ZodString, clothingProvisionId: z.ZodString]
		>([z.string(), z.string()])
		.action(
			async ({
				bindArgsParsedInputs: [containerProvisionId, clothingProvisionId],
				ctx: { provision },
			}) => {
				await prisma.clothingProvision.update({
					where: { id: clothingProvisionId },
					data: {
						containerOrder: null,
						containerProvision: {
							disconnect: { id: containerProvisionId },
						},
					},
				});

				revalidatePath(`/dashboard/${provision.tripId}/containers`);

				return {
					type: 'success',
					message: 'Packing gear provision successfully updated',
				};
			},
		);

const addDeleteEssentialProvisionContainerSchema = z.tuple([
	z.string(),
	z.string(),
]);
const essentialProvisionContainerClient = authenticatedActionClient.use(
	async ({ next, bindArgsClientInputs, ctx: { user } }) => {
		const [containerProvisionId, essentialProvisionId] =
			addDeleteEssentialProvisionContainerSchema.parse(bindArgsClientInputs);

		const provision = await prisma.essentialProvision.findUnique({
			where: { id: essentialProvisionId },
			include: { trip: true, essential: true },
		});
		if (!provision) throw new Error('Not found');

		if (provision.trip.userId !== user.id) throw new Error('Unauthorized');
		if (provision.essential.userId !== user.id) throw new Error('Unauthorized');

		const containerProvision = await prisma.containerProvision.findUnique({
			where: { id: containerProvisionId },
			include: { container: true },
		});
		if (!containerProvision) throw new Error('Not found');
		if (containerProvision.container.userId !== user.id)
			throw new Error('Unauthorized');

		return next({ ctx: { provision } });
	},
);

export const addEssentialProvisionToContainer =
	essentialProvisionContainerClient
		.metadata({ actionName: 'addEssentialProvisionToContainer' })
		.bindArgsSchemas<
			[containerProvisionId: z.ZodString, essentialProvisionId: z.ZodString]
		>([z.string(), z.string()])
		.action(
			async ({
				bindArgsParsedInputs: [containerProvisionId, essentialProvisionId],
				ctx: { provision },
			}) => {
				const lastEssentialProvision =
					await prisma.essentialProvision.findFirst({
						where: { containerProvisionId },
						orderBy: { containerOrder: 'desc' },
					});

				const order = lastEssentialProvision
					? LexoRank.parse(lastEssentialProvision.containerOrder!).genNext()
					: LexoRank.middle();

				await prisma.essentialProvision.update({
					where: { id: essentialProvisionId },
					data: {
						containerOrder: order.toString(),
						containerProvision: {
							connect: { id: containerProvisionId },
						},
					},
				});

				revalidatePath(`/dashboard/${provision.tripId}/containers`);

				return {
					type: 'success',
					message: 'Packing gear provision successfully updated',
				};
			},
		);

export const changeEssentialProvisionContainerOrder = essentialProvisionClient
	.metadata({ actionName: 'editEssentialProvisionContainerOrder' })
	.bindArgsSchemas<[essentialProvisionId: z.ZodString, newOrder: z.ZodString]>([
		z.string(),
		z.string(),
	])
	.action(
		async ({
			bindArgsParsedInputs: [provisionId, newOrder],
			ctx: { essentialProvision },
		}) => {
			await prisma.essentialProvision.update({
				where: { id: provisionId },
				data: { containerOrder: newOrder.toString() },
			});

			revalidatePath(`/dashboard/${essentialProvision.tripId}/containers`);

			return {
				type: 'success',
				message: 'Essential provision successfully edited',
			};
		},
	);

export const deleteEssentialProvisionFromContainer =
	essentialProvisionContainerClient
		.metadata({ actionName: 'deleteEssentialProvisionFromContainer' })
		.bindArgsSchemas<
			[containerProvisionId: z.ZodString, essentialProvisionId: z.ZodString]
		>([z.string(), z.string()])
		.action(
			async ({
				bindArgsParsedInputs: [containerProvisionId, essentialProvisionId],
				ctx: { provision },
			}) => {
				await prisma.essentialProvision.update({
					where: { id: essentialProvisionId },
					data: {
						containerOrder: null,
						containerProvision: {
							disconnect: { id: containerProvisionId },
						},
					},
				});

				revalidatePath(`/dashboard/${provision.tripId}/containers`);

				return {
					type: 'success',
					message: 'Packing gear provision successfully updated',
				};
			},
		);
