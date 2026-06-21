import { ApiError } from '@/lib/api/errors';
import { hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/db.server';

import { UserRole } from '@/generated/prisma/enums';

import type { CreateUserInput } from './schemas';

export interface AdminUserDTO {
	id: string;
	username: string;
	role: UserRole;
}

export async function getAllUsers(): Promise<AdminUserDTO[]> {
	return prisma.user.findMany({
		select: { id: true, username: true, role: true },
		orderBy: { username: 'asc' },
	});
}

/** Create a user WITHOUT signing anyone in (admin stays in their own session). */
export async function adminCreateUser(
	input: CreateUserInput,
): Promise<AdminUserDTO> {
	const exists = await prisma.user.findUnique({
		where: { username: input.username },
	});
	if (exists) throw new ApiError(409, 'That username is taken');
	return prisma.user.create({
		data: {
			username: input.username,
			password: await hashPassword(input.password),
			role: input.role,
		},
		select: { id: true, username: true, role: true },
	});
}

export async function adminDeleteUser(actorId: string, targetId: string) {
	if (actorId === targetId)
		throw new ApiError(400, 'You cannot delete your own account here');
	await prisma.$transaction(async (tx) => {
		const target = await tx.user.findUnique({ where: { id: targetId } });
		if (!target) throw new ApiError(404, 'User not found');
		if (target.role === UserRole.ADMIN) {
			const otherAdmins = await tx.user.count({
				where: { role: UserRole.ADMIN, NOT: { id: targetId } },
			});
			if (otherAdmins === 0)
				throw new ApiError(400, 'Cannot delete the last admin');
		}
		await tx.user.delete({ where: { id: targetId } });
	});
	return { success: true };
}

export async function adminResetPassword(targetId: string, password: string) {
	const target = await prisma.user.findUnique({ where: { id: targetId } });
	if (!target) throw new ApiError(404, 'User not found');
	await prisma.user.update({
		where: { id: targetId },
		data: { password: await hashPassword(password) },
	});
	return { success: true };
}

export async function adminSetRole(targetId: string, role: UserRole) {
	await prisma.$transaction(async (tx) => {
		const target = await tx.user.findUnique({ where: { id: targetId } });
		if (!target) throw new ApiError(404, 'User not found');
		if (target.role === UserRole.ADMIN && role === UserRole.USER) {
			const otherAdmins = await tx.user.count({
				where: { role: UserRole.ADMIN, NOT: { id: targetId } },
			});
			if (otherAdmins === 0)
				throw new ApiError(400, 'Cannot demote the last admin');
		}
		await tx.user.update({ where: { id: targetId }, data: { role } });
	});
	return { success: true };
}
