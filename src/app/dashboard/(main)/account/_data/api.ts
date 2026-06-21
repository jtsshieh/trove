import {
	PublicKeyCredentialCreationOptionsJSON,
	RegistrationResponseJSON,
} from '@simplewebauthn/types';

import type { VerifyRegistrationResponse } from '@/app/(auth)/_data/types';
import { api } from '@/lib/api/client';

import type { UpdateUserSettingsInput } from './schemas';

/** Re-exported so the passkey UI can switch on this union unchanged. */
export type { VerifyRegistrationResponse } from '@/app/(auth)/_data/types';

/** Client-side fetch functions for the (authed) account + settings resources. */

export const changeUsername = (username: string) =>
	api.patch<{ success: boolean }>('/api/account/username', { username });

export const deleteUser = () => api.del<{ success: boolean }>('/api/account');

export const updateUserSettings = (input: UpdateUserSettingsInput) =>
	api.patch<{ type: 'success'; message: string }>('/api/settings', input);

export const getRegistrationOptions = () =>
	api.get<PublicKeyCredentialCreationOptionsJSON>(
		'/api/account/passkeys/registration-options',
	);

export const verifyRegistration = (
	attestationResponse: RegistrationResponseJSON,
	webauthnUserId: string,
) =>
	api.post<VerifyRegistrationResponse>('/api/account/passkeys', {
		attestationResponse,
		webauthnUserId,
	});

export const renamePasskey = (passkeyId: string, name: string) =>
	api.patch<{ success: boolean }>(`/api/account/passkeys/${passkeyId}`, {
		name,
	});

export const deletePasskey = (passkeyId: string) =>
	api.del<{ success: boolean }>(`/api/account/passkeys/${passkeyId}`);
