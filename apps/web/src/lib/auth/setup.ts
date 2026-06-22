import { ApiError } from '@/lib/api/errors';
import { prisma } from '@/lib/db.server';

import { UserRole } from '@/generated/prisma/enums';

import { hashPassword, signIn } from './sign-in';

/**
 * First-run setup: create the very first user as ADMIN and sign them in. Guarded by
 * a transactional zero-user check so it can only ever run once (a second concurrent
 * call sees count > 0 and 403s). The cookie write happens after the tx (it can't run
 * inside the Prisma transaction callback).
 */
export async function createFirstAdmin(username: string, password: string) {
	const password_hash = await hashPassword(password);
	const user = await prisma.$transaction(async (tx) => {
		const count = await tx.user.count();
		if (count > 0) throw new ApiError(403, 'Setup already completed');
		return tx.user.create({
			data: { username, password: password_hash, role: UserRole.ADMIN },
		});
	});
	await signIn(user.id);
	return { success: true };
}
