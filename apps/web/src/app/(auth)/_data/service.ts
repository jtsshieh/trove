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
import {
	getPasskey,
	getUserPasskeys,
	signIn,
	signInWithPassword,
	signOut,
} from '@/lib/auth';
import { ApiError } from '@/lib/api/errors';
import { prisma } from '@/lib/db.server';

// Sign-in/out primitives now live in @/lib/auth; re-export so existing importers
// (account service, /api/auth/* routes) keep working unchanged.
export { signIn, signInWithPassword, signOut };

import aaguids from './aaguids.json';
import { origin, rpID, rpName } from './auth-constants';
import {
	createChallengeSession,
	deleteChallengeSession,
	getChallengeSession,
} from './session';
import type {
	AuthOptions,
	VerifyAuthResponse,
	VerifyRegistrationResponse,
} from './types';

/**
 * Server-side auth logic. The transport moved to /api/auth/** + /api/account/**
 * routes, but the JWT cookie, argon2 verify, @simplewebauthn calls, and the redis
 * challenge session are preserved byte-for-byte from the old server actions.
 */

export async function getRegistrationOptions(user: {
	id: string;
	username: string;
}) {
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

export async function verifyRegistration(
	user: { id: string },
	attestationResponse: RegistrationResponseJSON,
	webauthnUserId: string,
): Promise<VerifyRegistrationResponse> {
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

	return { type: 'success' };
}

export async function renamePasskey(
	userId: string,
	passkeyId: string,
	name: string,
) {
	const passkey = await prisma.passkey.findUnique({ where: { id: passkeyId } });
	if (!passkey) throw new ApiError(404, "doesn't exist");
	if (passkey.userId !== userId) throw new ApiError(403, 'Unauthorized');

	await prisma.passkey.update({ where: { id: passkeyId }, data: { name } });
	return { success: true };
}

export async function deletePasskey(userId: string, passkeyId: string) {
	const passkey = await prisma.passkey.findUnique({ where: { id: passkeyId } });
	if (!passkey) throw new ApiError(404, "doesn't exist");
	if (passkey.userId !== userId) throw new ApiError(403, 'Unauthorized');

	await prisma.passkey.delete({ where: { id: passkeyId } });
	return { success: true };
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

	await signIn(passkey.userId);

	return { type: 'success' };
}
