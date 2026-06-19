'use server';

import { LexoRank } from 'lexorank';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { authenticatedActionClient } from '../../../../../../lib/action-client';
import { prisma } from '../../../../../../lib/db.server';
import { getAllLuggage } from './fetchers';
import { createLuggageSchema, editLuggageSchema } from './schemas';

export async function fetchAllLuggage() {
	return getAllLuggage();
}

export const createLuggage = authenticatedActionClient
	.metadata({ actionName: 'createLuggage' })
	.inputSchema(createLuggageSchema)
	.action(async ({ parsedInput: { name }, ctx: { user } }) => {
		const lastLuggage = await prisma.luggage.findFirst({
			where: { userId: user.id },
			orderBy: { order: 'desc' },
		});

		const order = lastLuggage
			? LexoRank.parse(lastLuggage.order).genNext()
			: LexoRank.min();

		await prisma.luggage.create({
			data: {
				name,
				order: order.toString(),
				user: { connect: { id: user.id } },
			},
		});

		revalidatePath('/dashboard/packing-gear/luggage');

		return {
			type: 'success',
			message: 'Luggage successfully added',
		};
	});
const mutateLuggageArgsSchema = z.tuple([z.string()]);
const luggageClient = authenticatedActionClient.use(
	async ({ next, bindArgsClientInputs, ctx: { user } }) => {
		const [luggageId] = mutateLuggageArgsSchema.parse(bindArgsClientInputs);

		const luggage = await prisma.luggage.findUnique({
			where: { id: luggageId },
		});
		if (!luggage) throw new Error('Not found');
		if (luggage?.userId !== user.id) throw new Error('Unauthorized');

		return next({ ctx: { luggage } });
	},
);
export const editLuggage = luggageClient
	.metadata({ actionName: 'editLuggage' })
	.inputSchema(editLuggageSchema)
	.bindArgsSchemas<[luggageId: z.ZodString]>([z.string()])
	.action(async ({ parsedInput: { name, order }, ctx: { luggage } }) => {
		await prisma.luggage.update({
			where: { id: luggage.id },
			data: {
				name,
				order,
			},
		});

		revalidatePath('/dashboard/packing-gear/luggage');

		return {
			type: 'success',
			message: 'Luggage successfully edited',
		};
	});
export const deleteLuggage = luggageClient
	.metadata({ actionName: 'deleteLuggage' })
	.bindArgsSchemas<[luggageId: z.ZodString]>([z.string()])
	.action(async ({ ctx: { luggage } }) => {
		await prisma.luggage.delete({ where: { id: luggage.id } });

		revalidatePath('/dashboard/packing-gear/luggage');

		return {
			type: 'success',
			message: 'Luggage successfully removed',
		};
	});
