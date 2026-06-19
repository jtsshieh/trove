'use server';

import {
	generateAuthenticationOptions,
	generateRegistrationOptions,
	verifyAuthenticationResponse,
	verifyRegistrationResponse,
} from '@simplewebauthn/server';
import {
	AuthenticationResponseJSON,
	AuthenticatorTransportFuture,
	PublicKeyCredentialRequestOptionsJSON,
	RegistrationResponseJSON,
} from '@simplewebauthn/types';
import { verify } from 'argon2';
import { SignJWT } from 'jose';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { prisma } from '../../../lib/db.server';
import {
	getCurrentUserSafe,
	getPasskey,
	getUserPasskeys,
} from '../../dashboard/(main)/account/_data/fetchers';
import aaguids from './aaguids.json';
import { origin, rpID, rpName } from './auth-constants';
import { renamePasskeySchema } from './schemas';
import {
	createChallengeSession,
	deleteChallengeSession,
	getChallengeSession,
} from './session';

export async function getRegistrationOptions() {
	const user = await getCurrentUserSafe();
	const passkeys = await getUserPasskeys(user.id);

	const options = await generateRegistrationOptions({
		rpName,
		rpID,
		userName: user.username,
		excludeCredentials: passkeys.map((passkey) => ({
			id: passkey.credentialId,
		})),
		authenticatorSelection: {
			residentKey: 'preferred',
			userVerification: 'preferred',
			authenticatorAttachment: 'platform',
		},
	});
	await createChallengeSession(options.challenge);

	return options;
}

type VerifyRegistrationResponse =
	| VerifyRegistrationResponseSuccess
	| VerifyRegistrationResponseFailure;
interface VerifyRegistrationResponseSuccess {
	type: 'success';
}
interface VerifyRegistrationResponseFailure {
	type: 'failure';
	code: 'INVALID_PASSKEY' | 'TIME_OUT' | 'UNKNOWN';
}
export async function verifyRegistration(
	attestationResponse: RegistrationResponseJSON,
	webauthnUserId: string,
): Promise<VerifyRegistrationResponse> {
	const user = await getCurrentUserSafe();

	const challenge = await getChallengeSession();
	if (!challenge) return { type: 'failure', code: 'TIME_OUT' };
	await deleteChallengeSession();

	let verification;
	try {
		verification = await verifyRegistrationResponse({
			response: attestationResponse,
			expectedChallenge: challenge,
			expectedOrigin: origin,
			expectedRPID: rpID,
		});
	} catch {
		return { type: 'failure', code: 'UNKNOWN' };
	}

	if (!verification.verified || !verification.registrationInfo)
		return { type: 'failure', code: 'INVALID_PASSKEY' };

	await prisma.passkey.create({
		data: {
			user: { connect: { id: user.id } },
			webauthnUserId,
			credentialId: verification.registrationInfo.credentialID,
			publicKey: new Uint8Array(
				verification.registrationInfo.credentialPublicKey,
			),
			counter: verification.registrationInfo.counter,
			name:
				aaguids[verification.registrationInfo.aaguid as keyof typeof aaguids]
					?.name ?? 'New passkey',
			transports: attestationResponse.response.transports?.join(',') ?? '',
			aaguid: verification.registrationInfo.aaguid,
		},
	});

	revalidatePath('/dashboard/account');

	return { type: 'success' };
}

export async function renamePasskey(passkeyId: string, data: unknown) {
	const { name } = renamePasskeySchema.parse(data);

	const user = await getCurrentUserSafe();
	const passkey = await prisma.passkey.findUnique({ where: { id: passkeyId } });
	if (!passkey) throw new Error("doesn't exist");
	if (passkey.userId !== user.id) throw new Error('Unauthorized');

	await prisma.passkey.update({ where: { id: passkeyId }, data: { name } });

	revalidatePath('/dashboard/account');
}

export async function deletePasskey(passkeyId: string) {
	const user = await getCurrentUserSafe();
	const passkey = await prisma.passkey.findUnique({ where: { id: passkeyId } });
	if (!passkey) throw new Error("doesn't exist");
	if (passkey.userId !== user.id) throw new Error('Unauthorized');

	await prisma.passkey.delete({ where: { id: passkeyId } });

	revalidatePath('/dashboard/account');
}

export type AuthOptions =
	| AuthOptionsFailure
	| AuthOptionsPassword
	| AuthOptionsPasskey;
interface AuthOptionsFailure {
	type: 'failure';
	message: string;
}

interface AuthOptionsPassword {
	type: 'password';
}

interface AuthOptionsPasskey {
	type: 'passkey';
	options: PublicKeyCredentialRequestOptionsJSON;
}

export async function getAuthOptions(username: string): Promise<AuthOptions> {
	const user = await prisma.user.findUnique({
		where: { username },
		include: { passkeys: true },
	});
	if (!user) return { type: 'failure', message: "doesn't exist" };

	if (user.passkeys.length === 0) return { type: 'password' };

	const options: PublicKeyCredentialRequestOptionsJSON =
		await generateAuthenticationOptions({
			rpID,
			allowCredentials: user.passkeys.map((passkey) => ({
				id: passkey.credentialId,
				transports: passkey.transports.split(
					',',
				) as AuthenticatorTransportFuture[],
			})),
		});
	await createChallengeSession(options.challenge);

	return { type: 'passkey', options: options };
}

export async function getPasskeyOptions() {
	const options: PublicKeyCredentialRequestOptionsJSON =
		await generateAuthenticationOptions({
			rpID,
		});
	await createChallengeSession(options.challenge);

	return options;
}

type VerifyAuthResponse = VerifyAuthResponseSuccess | VerifyAuthResponseFailure;
interface VerifyAuthResponseSuccess {
	type: 'success';
}
interface VerifyAuthResponseFailure {
	type: 'failure';
	code: 'INVALID_PASSKEY' | 'TIME_OUT' | 'UNKNOWN';
}
export async function verifyAuthentication(
	authenticationResponse: AuthenticationResponseJSON,
): Promise<VerifyAuthResponse> {
	const challenge = await getChallengeSession();
	if (!challenge) return { type: 'failure', code: 'TIME_OUT' };
	await deleteChallengeSession();

	const passkey = await getPasskey(authenticationResponse.id);
	if (!passkey) return { type: 'failure', code: 'INVALID_PASSKEY' };

	let verification;
	try {
		verification = await verifyAuthenticationResponse({
			response: authenticationResponse,
			expectedChallenge: challenge,
			expectedOrigin: origin,
			expectedRPID: rpID,
			authenticator: {
				credentialID: passkey.credentialId,
				credentialPublicKey: passkey.publicKey,
				counter: Number(passkey.counter),
				transports: passkey.transports.split(
					',',
				) as AuthenticatorTransportFuture[],
			},
		});
	} catch {
		return { type: 'failure', code: 'UNKNOWN' };
	}

	if (!verification.verified)
		return { type: 'failure', code: 'INVALID_PASSKEY' };

	await prisma.passkey.update({
		where: { credentialId: passkey.credentialId },
		data: {
			counter: verification.authenticationInfo.newCounter,
			lastUsed: new Date(),
		},
	});

	await _signIn(passkey.userId);

	return { type: 'success' };
}

async function _signIn(userId: string) {
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
		await _signIn(user.id);
		return {
			success: true,
		};
	} else {
		return {
			success: false,
		};
	}
}

export async function signOut() {
	(await cookies()).delete('auth');
	revalidatePath('/dashboard');
	return { success: true };
}
