import { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/types';

/**
 * Auth response shapes shared between the route/service layer and the browser
 * client. Client-safe (no server imports) so the sign-in/up + passkey UIs can
 * switch on these discriminated unions exactly as they did over server actions.
 */

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

export type VerifyRegistrationResponse =
	| VerifyRegistrationResponseSuccess
	| VerifyRegistrationResponseFailure;
interface VerifyRegistrationResponseSuccess {
	type: 'success';
}
interface VerifyRegistrationResponseFailure {
	type: 'failure';
	code: 'INVALID_PASSKEY' | 'TIME_OUT' | 'UNKNOWN';
}

export type VerifyAuthResponse =
	| VerifyAuthResponseSuccess
	| VerifyAuthResponseFailure;
interface VerifyAuthResponseSuccess {
	type: 'success';
}
interface VerifyAuthResponseFailure {
	type: 'failure';
	code: 'INVALID_PASSKEY' | 'TIME_OUT' | 'UNKNOWN';
}
