'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { authenticatedActionClient } from '@/lib/action-client';
import { prisma } from '@/lib/db.server';

import { getAllBrands } from '../brands/_data/fetchers';
import { getAllClothingTypesWithClothes } from './fetchers';
import { createClothingSchema, editClothingSchema } from './schemas';

export async function fetchAllBrands() {
	return getAllBrands();
}

export async function fetchClothingTypesWithClothes() {
	return getAllClothingTypesWithClothes();
}

export const createClothing = authenticatedActionClient
	.metadata({ actionName: 'createClothing' })
	.inputSchema(createClothingSchema)
	.action(
		async ({
			parsedInput: { brandLine, color, number, modifier, type, brand },
			ctx: { user },
		}) => {
			await prisma.clothing.create({
				data: {
					brandLine,
					color,
					number,
					modifier,
					user: { connect: { id: user.id } },

					type: {
						connect: {
							name: type,
						},
					},
					brand: {
						connect: {
							name: brand,
						},
					},
				},
			});

			revalidatePath('/dashboard/wardrobe');
			return {
				type: 'success',
				message: 'Clothing successfully added',
			};
		},
	);

const mutateClothingArgsSchema = z.tuple([z.string()]);

const clothingClient = authenticatedActionClient.use(
	async ({ next, bindArgsClientInputs, ctx: { user } }) => {
		const [clothingId] = mutateClothingArgsSchema.parse(bindArgsClientInputs);

		const clothing = await prisma.clothing.findUnique({
			where: { id: clothingId },
		});
		if (clothing?.userId !== user.id) throw new Error('Unauthorized');

		return next({ ctx: { clothing } });
	},
);

export const editClothing = clothingClient
	.metadata({ actionName: 'editClothing' })
	.inputSchema(editClothingSchema)
	.bindArgsSchemas<[clothingId: z.ZodString]>([z.string()])
	.action(
		async ({
			parsedInput: { brandLine, color, number, modifier, type, brand },
			ctx: { clothing },
		}) => {
			const payload = {
				brandLine,
				color,
				number,
				modifier,
			};

			if (type) {
				Object.assign(payload, { type: { connect: { name: type } } });
			}
			if (brand) {
				Object.assign(payload, { brand: { connect: { name: brand } } });
			}
			await prisma.clothing.update({
				where: {
					id: clothing.id,
				},
				data: payload,
			});

			revalidatePath('/dashboard/wardrobe');
			return {
				type: 'success',
				message: 'Brand successfully edited',
			};
		},
	);

export const deleteClothing = clothingClient
	.metadata({ actionName: 'deleteClothing' })
	.bindArgsSchemas<[clothingId: z.ZodString]>([z.string()])
	.action(async ({ ctx: { clothing } }) => {
		await prisma.clothing.delete({
			where: {
				id: clothing.id,
			},
		});

		revalidatePath('/dashboard/wardrobe');
		return {
			type: 'success',
			message: 'Clothing successfully deleted',
		};
	});
