import {
	AuthenticationResponseJSON,
	PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/types';

import { api } from '@/lib/api/client';

import type { AuthOptions, VerifyAuthResponse } from './types';

/** Re-exported so the sign-in/up UIs can switch on these unions unchanged. */
export type { AuthOptions, VerifyAuthResponse } from './types';

/** Client-side fetch functions for the pre-session auth flows. */

export const getAuthOptions = (username: string) =>
	api.post<AuthOptions>('/api/auth/sign-in/options', { username });

export const signInWithPassword = (username: string, password: string) =>
	api.post<{ success: boolean }>('/api/auth/sign-in/password', {
		username,
		password,
	});

export const getPasskeyOptions = () =>
	api.post<PublicKeyCredentialRequestOptionsJSON>('/api/auth/passkey/options');

export const verifyAuthentication = (
	authenticationResponse: AuthenticationResponseJSON,
) =>
	api.post<VerifyAuthResponse>('/api/auth/passkey/verify', {
		authenticationResponse,
	});

export const signOut = () =>
	api.post<{ success: boolean }>('/api/auth/sign-out');
