import {
	AuthenticationResponseJSON,
	RegistrationResponseJSON,
} from '@simplewebauthn/types';
import { z } from 'zod';

export const renamePasskeySchema = z.object({
	name: z.string(),
});

/** Credentials for the username-only first step of sign-in. */
export const authOptionsSchema = z.object({
	username: z.string(),
});

/** Username + password sign-in (password path). */
export const passwordSignInSchema = z.object({
	username: z.string(),
	password: z.string(),
});

/** Sign-up: create the account, then sign in. */
export const signUpSchema = z.object({
	username: z.string(),
	password: z.string(),
});

/**
 * The opaque @simplewebauthn JSON blobs. They're validated by @simplewebauthn's
 * own verify calls (against the redis challenge), so here we just confirm they're
 * objects and let the typed wrappers below carry the precise shape.
 */
export const verifyAuthenticationSchema = z.object({
	authenticationResponse: z.custom<AuthenticationResponseJSON>(
		(v) => typeof v === 'object' && v !== null,
	),
});

export const verifyRegistrationSchema = z.object({
	attestationResponse: z.custom<RegistrationResponseJSON>(
		(v) => typeof v === 'object' && v !== null,
	),
	webauthnUserId: z.string(),
});
