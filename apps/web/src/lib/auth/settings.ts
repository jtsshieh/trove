import { cache } from 'react';

import { prisma } from '@/lib/db.server';

import {
	DisplayMode,
	PieceSize,
	ProvisionView,
	VolumeUnit,
} from '@/generated/prisma/enums';

import { getCurrentUserSafe } from './current-user';

export interface UserSettingsDTO {
	displayMode: DisplayMode;
	defaultProvisionView: ProvisionView;
	pieceSize: PieceSize;
	volumeUnit: VolumeUnit;
}

/** Display/view preferences, with defaults so a missing row needs no write. */
export const getUserSettings = cache(async (): Promise<UserSettingsDTO> => {
	const user = await getCurrentUserSafe();
	const settings = await prisma.userSettings.findUnique({
		where: { userId: user.id },
	});
	return {
		displayMode: settings?.displayMode ?? DisplayMode.Both,
		defaultProvisionView: settings?.defaultProvisionView ?? ProvisionView.List,
		pieceSize: settings?.pieceSize ?? PieceSize.Compact,
		volumeUnit: settings?.volumeUnit ?? VolumeUnit.Milliliters,
	};
});
