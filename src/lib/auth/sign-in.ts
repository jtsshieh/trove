import { hash, verify } from 'argon2';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

import { prisma } from '@/lib/db.server';

/** Hash a plaintext password (argon2) — used by setup / admin user creation. */
export const hashPassword = (password: string) => hash(password);

/** Issue the signed `auth` JWT cookie for a user. */
export async function signIn(userId: string) {
	const jwt = await new SignJWT({ sub: userId })
		.setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
		.setIssuedAt()
		.setExpirationTime('1 week')
		.sign(new TextEncoder().encode(process.env.JWT_SECRET!));

	(await cookies()).set('auth', jwt, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 60 * 24 * 7,
		path: '/',
	});
}

export async function signInWithPassword(username: string, password: string) {
	const user = await prisma.user.findUnique({ where: { username: username } });
	if (user && (await verify(user.password, password))) {
		await signIn(user.id);
		return { success: true };
	}
	return { success: false };
}

export async function signOut() {
	(await cookies()).delete('auth');
	return { success: true };
}
