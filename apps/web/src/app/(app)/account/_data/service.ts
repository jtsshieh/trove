import { prisma } from '@/lib/db.server';

import type { UpdateUserSettingsInput } from './schemas';

/**
 * Server-side account logic (delete / username / settings), scoped to the authed
 * user. Account creation now lives in setup (first admin) and the Admin app.
 */

export async function deleteUser(userId: string) {
	await prisma.user.delete({ where: { id: userId } });
	return { success: true };
}

export async function changeUsername(userId: string, newUsername: string) {
	try {
		await prisma.user.update({
			where: { id: userId },
			data: { username: newUsername },
		});
	} catch {
		return { success: false };
	}
	return { success: true };
}

export async function updateUserSettings(
	userId: string,
	input: UpdateUserSettingsInput,
) {
	await prisma.userSettings.upsert({
		where: { userId },
		update: input,
		create: { userId, ...input },
	});

	return { type: 'success', message: 'Settings updated' };
}
