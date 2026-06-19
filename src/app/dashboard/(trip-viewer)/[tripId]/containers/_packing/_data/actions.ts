'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { prisma } from '../../../../../../../lib/db.server';
import {
	clothingProvisionClient,
	essentialProvisionClient,
} from '../../../_data/clients';
import {
	markClothingProvisionPackedSchema,
	markEssentialProvisionPackedSchema,
} from './schemas';

export const markClothingProvisionPacked = clothingProvisionClient
	.metadata({ actionName: 'markClothingProvisionPacked' })
	.inputSchema(markClothingProvisionPackedSchema)
	.bindArgsSchemas<[clothingProvisionId: z.ZodString]>([z.string()])
	.action(
		async ({
			parsedInput: { packed },
			bindArgsParsedInputs: [clothingProvisionId],
			ctx: { clothingProvision },
		}) => {
			await prisma.clothingProvision.update({
				where: {
					id: clothingProvisionId,
				},
				data: {
					packed,
				},
			});

			revalidatePath(`/dashboard/${clothingProvision.tripId}/containers`);

			return {
				type: 'success',
				message: 'Clothing provision successfully updated',
			};
		},
	);

export const markEssentialProvisionPacked = essentialProvisionClient
	.metadata({ actionName: 'markEssentialProvisionPacked' })
	.inputSchema(markEssentialProvisionPackedSchema)
	.bindArgsSchemas<[essentialProvisionId: z.ZodString]>([z.string()])
	.action(
		async ({
			parsedInput: { packed },
			bindArgsParsedInputs: [essentialProvisionId],
			ctx: { essentialProvision },
		}) => {
			await prisma.essentialProvision.update({
				where: {
					id: essentialProvisionId,
				},
				data: {
					packed,
				},
			});

			revalidatePath(`/dashboard/${essentialProvision.tripId}/containers`);

			return {
				type: 'success',
				message: 'Essential provision successfully updated',
			};
		},
	);
