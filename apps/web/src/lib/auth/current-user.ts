import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { z } from 'zod';

import { ApiError } from '@/lib/api/errors';
import { prisma } from '@/lib/db.server';

import { UserRole } from '@/generated/prisma/enums';

export interface UserDTO {
	id: string;
	username: string;
	role: UserRole;
}

const jwtSchema = z.object({
	sub: z.string(),
});

async function _getCurrentUser(): Promise<UserDTO | null> {
	const token = (await cookies()).get('auth');
	if (!token) return null;

	let jwtUser;
	try {
		jwtUser = await jwtVerify(
			token.value,
			new TextEncoder().encode(process.env.JWT_SECRET!),
		);
	} catch {
		return null;
	}

	const parsed = jwtSchema.safeParse(jwtUser.payload);
	if (parsed.error) return null;

	// Read role from the DB (not the JWT) so role changes take effect immediately.
	const user = await prisma.user.findUnique({ where: { id: parsed.data.sub } });
	if (!user) return null;

	return { id: user.id, username: user.username, role: user.role };
}

export const getCurrentUser = cache(_getCurrentUser);

export const getCurrentUserSafe = async () => {
	const currentUser = await getCurrentUser();
	if (!currentUser) redirect('/sign-in');
	return currentUser;
};

/** Admin is a DB-backed role (set at first-run setup / managed in the Admin app). */
export function isAdmin(user: UserDTO): boolean {
	return user.role === UserRole.ADMIN;
}

/** Throws 403 for any API route a non-admin reaches. */
export function requireAdmin(user: UserDTO): void {
	if (!isAdmin(user)) throw new ApiError(403, 'Forbidden');
}

/**
 * Page/layout guard: redirect non-admins to the launcher (a thrown ApiError would
 * render an error boundary, not a redirect). Returns the admin user.
 */
export async function requireAdminPage(): Promise<UserDTO> {
	const user = await getCurrentUserSafe();
	if (!isAdmin(user)) redirect('/');
	return user;
}
