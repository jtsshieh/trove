'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { authenticatedActionClient } from '../../../../../lib/action-client';
import { prisma } from '../../../../../lib/db.server';
import { getAllEssentials } from './fetchers';
import { createEssentialSchema, editEssentialSchema } from './schemas';

export async function fetchAllEssentials() {
	return getAllEssentials();
}

export const createEssential = authenticatedActionClient
	.metadata({ actionName: 'createEssential' })
	.inputSchema(createEssentialSchema)
	.action(async ({ parsedInput: { name, category }, ctx: { user } }) => {
		await prisma.essential.create({
			data: {
				name,
				category,
				user: { connect: { id: user.id } },
			},
		});

		revalidatePath('/dashboard/essentials');

		return {
			type: 'success',
			message: 'Essential successfully added',
		};
	});

const mutateEssentialArgsSchema = z.tuple([z.string()]);

const essentialClient = authenticatedActionClient.use(
	async ({ next, bindArgsClientInputs, ctx: { user } }) => {
		const [essentialId] = mutateEssentialArgsSchema.parse(bindArgsClientInputs);

		const essential = await prisma.essential.findUnique({
			where: { id: essentialId },
		});
		if (essential?.userId !== user.id) throw new Error('Unauthorized');

		return next({ ctx: { essential } });
	},
);

export const editEssential = essentialClient
	.metadata({ actionName: 'editEssential' })
	.inputSchema(editEssentialSchema)
	.bindArgsSchemas<[essentialId: z.ZodString]>([z.string()])
	.action(async ({ parsedInput: { name, category }, ctx: { essential } }) => {
		await prisma.essential.update({
			where: {
				id: essential.id,
			},
			data: {
				name,
				category,
			},
		});

		revalidatePath('/dashboard/essentials');

		return {
			type: 'success',
			message: 'Essential successfully edited',
		};
	});

export const deleteEssential = essentialClient
	.metadata({ actionName: 'deleteEssential' })
	.bindArgsSchemas<[essentialId: z.ZodString]>([z.string()])
	.action(async ({ ctx: { essential } }) => {
		await prisma.essential.delete({
			where: {
				id: essential.id,
			},
		});

		revalidatePath('/dashboard/essentials');

		return {
			type: 'success',
			message: 'Essential successfully deleted',
		};
	});
