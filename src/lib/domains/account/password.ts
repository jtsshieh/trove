import { verify } from 'argon2';
import { z } from 'zod';

import { ApiError } from '@/lib/api/errors';
import { hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/db.server';

export const changePasswordSchema = z.object({
	currentPassword: z.string().min(1),
	newPassword: z.string().min(8),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export async function changePassword(
	userId: string,
	input: ChangePasswordInput,
) {
	const user = await prisma.user.findUnique({ where: { id: userId } });
	if (!user || !(await verify(user.password, input.currentPassword))) {
		throw new ApiError(400, 'Current password is incorrect');
	}
	await prisma.user.update({
		where: { id: userId },
		data: { password: await hashPassword(input.newPassword) },
	});
	return { success: true };
}
