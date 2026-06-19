'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { authenticatedActionClient } from '../../../../../../../lib/action-client';
import { prisma } from '../../../../../../../lib/db.server';
import { tripClient } from '../../../_data/clients';
import { createLuggageProvisionSchema } from './schemas';

export const createLuggageProvision = tripClient
	.metadata({ actionName: 'createLuggageProvision' })
	.inputSchema(createLuggageProvisionSchema)
	.bindArgsSchemas<[tripId: z.ZodString]>([z.string()])
	.action(
		async ({
			parsedInput: { luggageId },
			bindArgsParsedInputs: [tripId],
			ctx: { user },
		}) => {
			const luggage = await prisma.luggage.findUnique({
				where: { id: luggageId },
			});
			if (luggage?.userId !== user.id) throw new Error('Unauthorized');

			await prisma.luggageProvision.create({
				data: {
					trip: { connect: { id: tripId } },
					luggage: { connect: { id: luggage.id } },
				},
			});

			revalidatePath(`/dashboard/${tripId}/luggage`);

			return {
				type: 'success',
				message: 'Luggage provision successfully added',
			};
		},
	);

export const deleteLuggageProvision = authenticatedActionClient
	.metadata({ actionName: 'deleteLuggageProvision' })
	.bindArgsSchemas<[provisionId: z.ZodString]>([z.string()])
	.action(async ({ bindArgsParsedInputs: [provisionId], ctx: { user } }) => {
		const provision = await prisma.luggageProvision.findUnique({
			where: { id: provisionId },
			include: { trip: true },
		});
		if (provision?.trip.userId !== user.id) throw new Error('Unauthorized');

		await prisma.luggageProvision.delete({ where: { id: provisionId } });

		revalidatePath(`/dashboard/${provision.tripId}/luggage`);

		return {
			type: 'success',
			message: 'Luggage provision successfully removed',
		};
	});

const addDeleteContainerProvisionLuggageSchema = z.tuple([
	z.string(),
	z.string(),
]);
const containerProvisionLuggageClient = authenticatedActionClient.use(
	async ({ next, bindArgsClientInputs, ctx: { user } }) => {
		const [luggageProvisionId, containerProvisionId] =
			addDeleteContainerProvisionLuggageSchema.parse(bindArgsClientInputs);

		const provision = await prisma.containerProvision.findUnique({
			where: { id: containerProvisionId },
			include: { trip: true, container: true },
		});
		if (!provision) throw new Error('Not found');

		if (provision.trip.userId !== user.id) throw new Error('Unauthorized');
		if (provision.container.userId !== user.id) throw new Error('Unauthorized');

		const luggageProvision = await prisma.luggageProvision.findUnique({
			where: { id: luggageProvisionId },
			include: { luggage: true },
		});
		if (!luggageProvision) throw new Error('Not found');
		if (luggageProvision.luggage.userId !== user.id)
			throw new Error('Unauthorized');

		return next({ ctx: { provision } });
	},
);

export const addContainerProvisionToLuggage = containerProvisionLuggageClient
	.metadata({ actionName: 'addContainerProvisionToLuggage' })
	.bindArgsSchemas<
		[luggageProvisionId: z.ZodString, containerProvisionId: z.ZodString]
	>([z.string(), z.string()])
	.action(
		async ({
			bindArgsParsedInputs: [luggageProvisionId, containerProvisionId],
			ctx: { provision },
		}) => {
			await prisma.luggageProvision.update({
				where: { id: luggageProvisionId },
				data: {
					containerProvisions: { connect: { id: containerProvisionId } },
				},
			});

			revalidatePath(`/dashboard/${provision.tripId}/luggage`);

			return {
				type: 'success',
				message: 'Luggage provision successfully updated',
			};
		},
	);

export const deleteContainerProvisionFromLuggage =
	containerProvisionLuggageClient
		.metadata({ actionName: 'deleteContainerProvisionFromLuggage' })
		.bindArgsSchemas<
			[luggageProvisionId: z.ZodString, containerProvisionId: z.ZodString]
		>([z.string(), z.string()])
		.action(
			async ({
				bindArgsParsedInputs: [luggageProvisionId, containerProvisionId],
				ctx: { provision },
			}) => {
				await prisma.luggageProvision.update({
					where: { id: luggageProvisionId },
					data: {
						containerProvisions: {
							disconnect: { id: containerProvisionId },
						},
					},
				});

				revalidatePath(`/dashboard/${provision.tripId}/luggage`);

				return {
					type: 'success',
					message: 'Luggage provision successfully updated',
				};
			},
		);
