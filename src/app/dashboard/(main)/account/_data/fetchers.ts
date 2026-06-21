import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { z } from 'zod';

import { prisma } from '../../../../../lib/db.server';
import { DisplayMode, PieceSize, ProvisionView } from '@/generated/prisma/enums';

export interface UserDTO {
	id: string;
	username: string;
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

	const user = await prisma.user.findUnique({ where: { id: parsed.data.sub } });
	if (!user) return null;

	return { id: user.id, username: user.username };
}

export const getCurrentUser = cache(_getCurrentUser);

export const getCurrentUserSafe = async () => {
	const currentUser = await getCurrentUser();
	if (!currentUser) redirect('/sign-in');
	return currentUser;
};

export interface UserSettingsDTO {
	displayMode: DisplayMode;
	defaultProvisionView: ProvisionView;
	pieceSize: PieceSize;
}

/** Display/view preferences, with defaults so a missing row needs no write. */
export const getUserSettings = cache(async (): Promise<UserSettingsDTO> => {
	const user = await getCurrentUserSafe();
	const settings = await prisma.userSettings.findUnique({
		where: { userId: user.id },
	});
	return {
		displayMode: settings?.displayMode ?? DisplayMode.Both,
		defaultProvisionView:
			settings?.defaultProvisionView ?? ProvisionView.List,
		pieceSize: settings?.pieceSize ?? PieceSize.Compact,
	};
});

export const getUserPasskeys = async (userId: string) => {
	return prisma.passkey.findMany({
		where: { userId },
		orderBy: { createdAt: 'asc' },
	});
};

export const getPasskey = async (credentialId: string) => {
	return prisma.passkey.findUnique({ where: { credentialId } });
};

export interface PasskeyDTO {
	id: string;
	name: string;
	createdAt: Date;
	lastUsed: Date | null;
	aaguid: string;
}
