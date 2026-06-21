import { z } from 'zod';

/**
 * Shapes returned by the headless updater (validated server-side in service.ts).
 * Kept client-safe (zod only, no server imports) so the page/components can import
 * the inferred types.
 */

export const commitInfoSchema = z.object({
	sha: z.string(),
	shaShort: z.string(),
	subject: z.string(),
	committedAt: z.string().nullable(),
});

export const systemStatusSchema = z.object({
	state: z.enum(['idle', 'updating', 'error']),
	branch: z.string(),
	current: commitInfoSchema,
	deployedSha: z.string().nullable(),
	log: z.array(z.string()),
	updatedAt: z.string().nullable(),
	error: z.string().nullable(),
});

export const changelogEntrySchema = z.object({
	sha: z.string(),
	subject: z.string(),
});

export const updateCheckSchema = z.object({
	updateAvailable: z.boolean(),
	behindBy: z.number(),
	currentShaShort: z.string(),
	latestShaShort: z.string(),
	changelog: z.array(changelogEntrySchema),
});

export type SystemStatus = z.infer<typeof systemStatusSchema>;
export type UpdateCheck = z.infer<typeof updateCheckSchema>;
export type ChangelogEntry = z.infer<typeof changelogEntrySchema>;
