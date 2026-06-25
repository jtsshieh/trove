import { cache } from 'react';

import { getCurrentUserSafe } from '@/app/(app)/account/_data/fetchers';
import { getAllBathroomProducts } from '@/app/(app)/bathroom/_data/fetchers';
import { getAllDocuments } from '@/app/(app)/documents/_data/fetchers';
import { getAllElectronics } from '@/app/(app)/electronics/_data/fetchers';
import { prisma } from '@/lib/db.server';

import { buildEssentialCatalog } from '../../_data/essential-catalog';
import { essentialItemInclude } from '../../_data/essential-item';
import { getAllEssentialGroups } from '../../../templates/_data/fetchers';

/** Essential provisions for a trip, ordered by section → day → dayOrder. */
export const getTripEssentialsBoard = cache(async (tripId: string) => {
	const user = await getCurrentUserSafe();

	return prisma.trip.findFirst({
		where: { id: tripId, userId: user.id },
		include: {
			essentialProvisions: {
				include: essentialItemInclude,
				orderBy: [{ section: 'asc' }, { day: 'asc' }, { dayOrder: 'asc' }],
			},
			tripEssentialGroups: {
				orderBy: { order: 'asc' },
			},
		},
	});
});

export type TripEssentialsBoard = NonNullable<
	Awaited<ReturnType<typeof getTripEssentialsBoard>>
>;

/**
 * The item catalog for the add picker: every bathroom variant, electronic, and
 * document the user owns, flattened to `{ kind, itemId, name, imageKey }` picks and
 * grouped by app.
 */
export const getEssentialItemCatalog = cache(async () => {
	const [bathroom, electronics, documents] = await Promise.all([
		getAllBathroomProducts(),
		getAllElectronics(),
		getAllDocuments(),
	]);
	return buildEssentialCatalog(bathroom, electronics, documents);
});

/**
 * The full board read in one shot: the trip's essentials board (provisions +
 * sub-groups), the item catalog (for the add picker), and the user's premade
 * essential-group templates (the import picker). Every board mutation invalidates this
 * single query, so all three refresh together. Null when the trip isn't found / owned.
 */
export const getEssentialsBoardData = cache(async (tripId: string) => {
	const [board, catalog, groups] = await Promise.all([
		getTripEssentialsBoard(tripId),
		getEssentialItemCatalog(),
		getAllEssentialGroups(),
	]);
	if (!board) return null;
	return { board, catalog, groups };
});

export type EssentialsBoardData = NonNullable<
	Awaited<ReturnType<typeof getEssentialsBoardData>>
>;
