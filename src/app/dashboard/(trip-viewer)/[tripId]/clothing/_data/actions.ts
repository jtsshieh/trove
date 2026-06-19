'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { prisma } from '@/lib/db.server';

import { clothingProvisionClient, tripClient } from '../../_data/clients';
import { createClothingProvisionSchema } from './schemas';

export const createClothingProvision = tripClient
	.metadata({ actionName: 'createClothingProvision' })
	.inputSchema(createClothingProvisionSchema)
	.bindArgsSchemas<[tripId: z.ZodString]>([z.string()])
	.action(
		async ({
			parsedInput: { clothing, day },
			bindArgsParsedInputs: [tripId],
			ctx: { trip, user },
		}) => {
			const foundClothing = await prisma.clothing.findUnique({
				where: { id: clothing },
			});
			if (foundClothing?.userId !== user.id) throw new Error('Unauthorized');

			await prisma.clothingProvision.create({
				data: {
					trip: { connect: { id: tripId } },
					clothing: { connect: { id: clothing } },
					day,
				},
			});

			revalidatePath(`/dashboard/${tripId}/clothing`);

			return {
				type: 'success',
				message: 'Clothing provision successfully added',
			};
		},
	);

export const deleteClothingProvision = clothingProvisionClient
	.metadata({ actionName: 'deleteClothingProvision' })
	.bindArgsSchemas<[clothingProvisionid: z.ZodString]>([z.string()])
	.action(
		async ({
			bindArgsParsedInputs: [provisionId],
			ctx: { clothingProvision },
		}) => {
			await prisma.clothingProvision.delete({ where: { id: provisionId } });

			revalidatePath(`/dashboard/${clothingProvision.tripId}/clothing`);

			return {
				type: 'success',
				message: 'Clothing provision successfully removed',
			};
		},
	);
