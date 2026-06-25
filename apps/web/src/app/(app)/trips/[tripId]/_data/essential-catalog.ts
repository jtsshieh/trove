// The shared item catalog for the Essentials layer. Both the trip board's add-picker
// and the template group dialogs offer the same three flattened pick-lists — one per
// app — built from the bathroom / electronics / documents reads. A pick is the
// (kind, itemId) pair the polymorphic create-data needs, plus display fields.

import type { EssentialKind } from '@/generated/prisma/enums';

import type { getAllBathroomProducts } from '@/app/(app)/bathroom/_data/fetchers';
import type { getAllDocuments } from '@/app/(app)/documents/_data/fetchers';
import type { getAllElectronics } from '@/app/(app)/electronics/_data/fetchers';

/** One offerable item — the polymorphic FK pair plus how to display it. */
export interface EssentialItemPickOption {
	/** Stable React/select key, unique across all three apps. */
	key: string;
	kind: EssentialKind;
	itemId: string;
	name: string;
	imageKey: string | null;
}

/** The three flattened pick-lists, one per app. */
export interface EssentialItemCatalog {
	bathroom: EssentialItemPickOption[];
	electronic: EssentialItemPickOption[];
	document: EssentialItemPickOption[];
}

type BathroomProducts = Awaited<ReturnType<typeof getAllBathroomProducts>>;
type Electronics = Awaited<ReturnType<typeof getAllElectronics>>;
type Documents = Awaited<ReturnType<typeof getAllDocuments>>;

/** A pick's stable key — namespaced by kind so ids never collide across apps. */
export function pickKey(kind: EssentialKind, itemId: string): string {
	return `${kind}:${itemId}`;
}

/**
 * Flatten the three app reads into pick-lists. Bathroom offers each VARIANT (the
 * provisionable unit), labelled "Product · Variant"; electronics and documents offer
 * the row itself.
 */
export function buildEssentialCatalog(
	bathroom: BathroomProducts,
	electronics: Electronics,
	documents: Documents,
): EssentialItemCatalog {
	const bathroomPicks: EssentialItemPickOption[] = [];
	for (const product of bathroom) {
		for (const variant of product.variants) {
			bathroomPicks.push({
				key: pickKey('Bathroom', variant.id),
				kind: 'Bathroom',
				itemId: variant.id,
				name: variant.label ? `${product.name} · ${variant.label}` : product.name,
				imageKey: product.imageKey,
			});
		}
	}

	const electronicPicks: EssentialItemPickOption[] = electronics.map((e) => ({
		key: pickKey('Electronic', e.id),
		kind: 'Electronic',
		itemId: e.id,
		name: e.name,
		imageKey: e.imageKey,
	}));

	const documentPicks: EssentialItemPickOption[] = documents.map((d) => ({
		key: pickKey('Document', d.id),
		kind: 'Document',
		itemId: d.id,
		name: d.name,
		imageKey: null,
	}));

	return {
		bathroom: bathroomPicks,
		electronic: electronicPicks,
		document: documentPicks,
	};
}
