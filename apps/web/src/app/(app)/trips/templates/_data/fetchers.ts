import { cache } from 'react';

import { getCurrentUserSafe } from '@/lib/auth';
import { prisma } from '@/lib/db.server';

import { getAllBathroomProducts } from '@/app/(app)/bathroom/_data/fetchers';
import { getAllDocuments } from '@/app/(app)/documents/_data/fetchers';
import { getAllElectronics } from '@/app/(app)/electronics/_data/fetchers';

import { buildEssentialCatalog } from '../../[tripId]/_data/essential-catalog';
import { essentialItemInclude } from '../../[tripId]/_data/essential-item';

/**
 * Reusable Essential-group templates, ordered by lexorank, with their polymorphic
 * items resolved (each item carries its bathroom variant / electronic / document so
 * a card can display it via `resolveEssentialItem`).
 */
export const getAllEssentialGroups = cache(async () => {
	const user = await getCurrentUserSafe();
	return prisma.essentialGroup.findMany({
		where: { userId: user.id },
		orderBy: { order: 'asc' },
		include: {
			items: {
				orderBy: { order: 'asc' },
				include: essentialItemInclude,
			},
		},
	});
});

/**
 * The flattened item catalog the group dialogs pick from: every bathroom variant,
 * electronic, and document the user owns, normalised to `{ kind, itemId, name,
 * imageKey }` picks and grouped by app.
 */
export const getEssentialItemCatalog = cache(async () => {
	const [bathroom, electronics, documents] = await Promise.all([
		getAllBathroomProducts(),
		getAllElectronics(),
		getAllDocuments(),
	]);
	return buildEssentialCatalog(bathroom, electronics, documents);
});

/** The templates page reads the groups + the item catalog in one shot. */
export const getTemplatesPageData = cache(async () => {
	const [groups, catalog] = await Promise.all([
		getAllEssentialGroups(),
		getEssentialItemCatalog(),
	]);
	return { groups, catalog };
});

export type TemplatesPageData = Awaited<ReturnType<typeof getTemplatesPageData>>;
