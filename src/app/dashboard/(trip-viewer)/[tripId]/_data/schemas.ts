import { TripMode } from '@/generated/prisma/enums';
import { z } from 'zod';

export const createTripSchema = z.object({
	name: z.string(),
	date: z.object({ from: z.date(), to: z.date() }),
});
export const editTripSchema = z.object({
	name: z.string().optional(),
	date: z.object({ from: z.date().optional(), to: z.date().optional() }),
});

export const changeTripModeSchema = z.object({
	mode: z.enum([TripMode.Provision, TripMode.Pack, TripMode.Audit]),
});
