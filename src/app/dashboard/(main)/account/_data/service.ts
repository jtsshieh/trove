import { hash } from 'argon2';

import { signInWithPassword } from '@/app/(auth)/_data/service';
import { prisma } from '@/lib/db.server';

import type { UpdateUserSettingsInput } from './schemas';

/**
 * Server-side account logic (create/delete/username + settings). Username/delete/
 * settings are scoped to the authed user; createUser composes the sign-in helper.
 */

export async function createUser(username: string, password: string) {
	const hasUsername =
		(await prisma.user.findUnique({ where: { username } })) !== null;
	if (hasUsername) return { success: false, message: 'USERNAME_TAKEN' };

	await prisma.user.create({
		data: {
			username: username,
			password: await hash(password),
		},
	});
	return await signInWithPassword(username, password);
}

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
