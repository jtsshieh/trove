import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';

import { redis } from '@/lib/db.server';

export async function createChallengeSession(challenge: string) {
	const cookieStore = await cookies();
	const cookie = cookieStore.get('session');
	if (cookie) await deleteChallengeSession();

	const sessionId = randomBytes(16).toString('base64');
	cookieStore.set('session', sessionId, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 5,
		path: '/',
	});
	console.log(sessionId);
	await redis.set(sessionId, challenge, 'EX', 60 * 5);
}

export async function getChallengeSession() {
	const cookieStore = await cookies();
	const cookie = cookieStore.get('session');
	if (!cookie) return;

	const val = await redis.get(cookie.value);
	if (!val) return;

	return val;
}

export async function deleteChallengeSession() {
	const cookieStore = await cookies();
	const cookie = cookieStore.get('session');
	if (!cookie) return;

	await redis.del(cookie.value);
	cookieStore.delete('session');
}
