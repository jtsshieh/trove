import { prisma } from '@/lib/db.server';

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
