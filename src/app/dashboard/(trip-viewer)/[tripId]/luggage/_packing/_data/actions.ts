'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { prisma } from '../../../../../../../lib/db.server';
import { containerProvisionClient } from '../../../_data/clients';
import { markContainerPackedSchema } from './schemas';

export const markContainerPacked = containerProvisionClient
	.metadata({ actionName: 'markContainerPacked' })
	.inputSchema(markContainerPackedSchema)
	.bindArgsSchemas<[containerProvisionId: z.ZodString]>([z.string()])
	.action(
		async ({
			parsedInput: { packed },
			bindArgsParsedInputs: [containerProvisionId],
			ctx: { containerProvision },
		}) => {
			await prisma.containerProvision.update({
				where: {
					id: containerProvisionId,
				},
				data: {
					packed,
				},
			});

			revalidatePath(`/dashboard/${containerProvision.tripId}/luggage`);

			return {
				type: 'success',
				message: 'Container provision successfully updated',
			};
		},
	);
