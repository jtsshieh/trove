'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { authenticatedActionClient } from '@/lib/action-client';
import { prisma } from '@/lib/db.server';

import { tripClient } from './clients';
import { getAllTrips } from './fetchers';
import {
	changeTripModeSchema,
	createTripSchema,
	editTripSchema,
} from './schemas';

export async function fetchAllTrips() {
	return getAllTrips();
}

export const createTrip = authenticatedActionClient
	.metadata({ actionName: 'createTrip' })
	.inputSchema(createTripSchema)
	.action(async ({ parsedInput: { name, date }, ctx: { user } }) => {
		const trip = await prisma.trip.create({
			data: {
				name,
				start: date.from,
				end: date.to,
				user: { connect: { id: user.id } },
			},
		});

		revalidatePath(`/dashboard`);

		return {
			type: 'success',
			message: 'Trip successfully added',
			tripId: trip.id,
		};
	});

export const editTrip = tripClient
	.metadata({ actionName: 'editTrip' })
	.inputSchema(editTripSchema)
	.bindArgsSchemas<[tripId: z.ZodString]>([z.string()])
	.action(
		async ({ parsedInput: { name, date }, bindArgsParsedInputs: [tripId] }) => {
			await prisma.trip.update({
				where: {
					id: tripId,
				},
				data: { name, start: date.from, end: date.to },
			});

			revalidatePath('/dashboard');
			revalidatePath(`/dashboard/${tripId}`, 'layout');

			return {
				type: 'success',
				message: 'Trip successfully edited',
			};
		},
	);

export const deleteTrip = tripClient
	.metadata({ actionName: 'deleteTrip' })
	.bindArgsSchemas<[tripId: z.ZodString]>([z.string()])
	.action(async ({ bindArgsParsedInputs: [tripId] }) => {
		await prisma.trip.delete({
			where: {
				id: tripId,
			},
		});

		revalidatePath('/dashboard');
		revalidatePath(`/dashboard/${tripId}`, 'layout');

		return {
			type: 'success',
			message: 'Trip successfully deleted',
		};
	});

export const changeTripMode = tripClient
	.metadata({ actionName: 'changeTripMode' })
	.inputSchema(changeTripModeSchema)
	.bindArgsSchemas<[tripId: z.ZodString]>([z.string()])
	.action(async ({ parsedInput: { mode }, bindArgsParsedInputs: [tripId] }) => {
		await prisma.trip.update({
			where: {
				id: tripId,
			},
			data: { mode },
		});

		revalidatePath(`/dashboard/${tripId}`, 'layout');

		// redirect(`/dashboard/${tripId}`);
	});
