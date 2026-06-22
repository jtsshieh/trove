import React from 'react';

import {
	PasskeyDTO,
	getCurrentUserSafe,
	getUserPasskeys,
} from './_data/fetchers';
import { AuthCardInteractive } from './auth-card-interactive';

export async function AuthCard() {
	const user = await getCurrentUserSafe();
	const passkeys = await getUserPasskeys(user.id);

	const passkeyDTOs: PasskeyDTO[] = passkeys.map(
		({ id, name, createdAt, lastUsed, aaguid }) => ({
			id,
			name,
			createdAt,
			lastUsed,
			aaguid,
		}),
	);

	return <AuthCardInteractive passkeys={passkeyDTOs} />;
}
