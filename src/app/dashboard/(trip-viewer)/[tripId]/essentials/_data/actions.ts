'use server';

import { LexoRank } from 'lexorank';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { prisma } from '../../../../../../lib/db.server';
import { essentialProvisionClient, tripClient } from '../../_data/clients';
import { createEssentialProvisionSchema } from './schemas';

export const createEssentialProvision = tripClient
	.metadata({ actionName: 'createEssentialProvision' })
	.inputSchema(createEssentialProvisionSchema)
	.bindArgsSchemas<[tripId: z.ZodString]>([z.string()])
	.action(
		async ({
			parsedInput: { id },
			bindArgsParsedInputs: [tripId],
			ctx: { user, trip },
		}) => {
			const essential = await prisma.essential.findUnique({
				where: { id },
			});
			if (essential?.userId !== user.id) throw new Error('Unauthorized');

			const lastEssentialProvision = await prisma.essentialProvision.findFirst({
				where: { tripId },
				orderBy: { order: 'desc' },
			});

			const order = lastEssentialProvision
				? LexoRank.parse(lastEssentialProvision.order).genNext()
				: LexoRank.middle();

			await prisma.essentialProvision.create({
				data: {
					order: order.toString(),
					trip: { connect: { id: tripId } },
					essential: { connect: { id } },
				},
			});

			revalidatePath(`/dashboard/${tripId}/essentials`);

			return {
				type: 'success',
				message: 'Essential provision successfully added',
			};
		},
	);

export const changeEssentialProvisionOrder = essentialProvisionClient
	.metadata({ actionName: 'changeEssentialProvisionOrder' })
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
				data: { order: newOrder },
			});

			revalidatePath(`/dashboard/${essentialProvision.tripId}/essentials`);

			return {
				type: 'success',
				message: 'Essential provision successfully edited',
			};
		},
	);

export const deleteEssentialProvision = essentialProvisionClient
	.metadata({ actionName: 'deleteEssentialProvision' })
	.bindArgsSchemas<[essentialProvisionId: z.ZodString]>([z.string()])
	.action(
		async ({
			bindArgsParsedInputs: [provisionId],
			ctx: { essentialProvision },
		}) => {
			await prisma.essentialProvision.delete({ where: { id: provisionId } });

			revalidatePath(`/dashboard/${essentialProvision.tripId}/essentials`);

			return {
				type: 'success',
				message: 'Essential provision successfully removed',
			};
		},
	);
