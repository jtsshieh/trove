'use server';

import { LexoRank } from 'lexorank';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { authenticatedActionClient } from '../../../../../../lib/action-client';
import { prisma } from '../../../../../../lib/db.server';
import { getAllContainers } from './fetchers';
import { createContainerSchema, editContainerSchema } from './schemas';

export async function fetchAllContainers() {
	return getAllContainers();
}

export const createContainer = authenticatedActionClient
	.metadata({ actionName: 'createContainer' })
	.inputSchema(createContainerSchema)
	.action(async ({ parsedInput: { name, type }, ctx: { user } }) => {
		const lastcontainer = await prisma.container.findFirst({
			where: { userId: user.id },
			orderBy: { order: 'desc' },
		});

		const order = lastcontainer
			? LexoRank.parse(lastcontainer.order).genNext()
			: LexoRank.middle();

		await prisma.container.create({
			data: {
				name,
				type,
				order: order.toString(),
				user: { connect: { id: user.id } },
			},
		});

		revalidatePath('/dashboard/packing-gear/containers');

		return {
			type: 'success',
			message: 'Container successfully added',
		};
	});

const mutateContainerArgsSchema = z.tuple([z.string()]);

const containerClient = authenticatedActionClient.use(
	async ({ next, bindArgsClientInputs, ctx: { user } }) => {
		const [containerId] = mutateContainerArgsSchema.parse(bindArgsClientInputs);

		const container = await prisma.container.findUnique({
			where: { id: containerId },
		});
		if (!container) throw new Error('Not found');
		if (container?.userId !== user.id) throw new Error('Unauthorized');

		return next({ ctx: { container } });
	},
);

export const editContainer = containerClient
	.metadata({ actionName: 'editContainer' })
	.inputSchema(editContainerSchema)
	.bindArgsSchemas<[containerId: z.ZodString]>([z.string()])
	.action(
		async ({ parsedInput: { name, type, order }, ctx: { container } }) => {
			await prisma.container.update({
				where: { id: container.id },
				data: {
					name,
					type,
					order,
				},
			});

			revalidatePath('/dashboard/packing-gear/containers');

			return {
				type: 'success',
				message: 'Container successfully edited',
			};
		},
	);

export const deleteContainer = containerClient
	.metadata({ actionName: 'deleteContainer' })
	.bindArgsSchemas<[containerId: z.ZodString]>([z.string()])
	.action(async ({ ctx: { container } }) => {
		await prisma.container.delete({ where: { id: container.id } });

		revalidatePath('/dashboard/packing-gear/containers');

		return {
			type: 'success',
			message: 'Container successfully removed',
		};
	});
