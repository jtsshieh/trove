// The Essentials packing layer is item-polymorphic: a provision (or group item)
// references exactly one of a bathroom variant, an electronic, or a document,
// matching its `kind`. These helpers centralise the include shape, display
// resolution, and the create-data FK so every trips consumer agrees.

import type { EssentialKind } from '@/generated/prisma/enums';

// Prisma `include` for resolving a provision/group-item's polymorphic item.
export const essentialItemInclude = {
	bathroomVariant: { include: { product: true } },
	electronic: true,
	document: true,
} as const;

export interface ResolvedEssentialItem {
	kind: EssentialKind;
	itemId: string; // the polymorphic FK value
	name: string;
	imageKey: string | null;
}

// Structural shape produced by `essentialItemInclude` (works for both
// EssentialProvision and EssentialGroupItem rows).
export interface PolymorphicItemRow {
	bathroomVariant:
		| {
				id: string;
				label: string | null;
				product: { name: string; imageKey: string | null };
		  }
		| null;
	electronic: { id: string; name: string; imageKey: string | null } | null;
	document: { id: string; name: string } | null;
}

export function resolveEssentialItem(row: PolymorphicItemRow): ResolvedEssentialItem {
	if (row.bathroomVariant) {
		const v = row.bathroomVariant;
		return {
			kind: 'Bathroom',
			itemId: v.id,
			name: v.label ? `${v.product.name} · ${v.label}` : v.product.name,
			imageKey: v.product.imageKey,
		};
	}
	if (row.electronic) {
		return {
			kind: 'Electronic',
			itemId: row.electronic.id,
			name: row.electronic.name,
			imageKey: row.electronic.imageKey,
		};
	}
	if (row.document) {
		return {
			kind: 'Document',
			itemId: row.document.id,
			name: row.document.name,
			imageKey: null,
		};
	}
	throw new Error('Essential provision has no item');
}

// Build the create-data polymorphic FK (+ kind) from a (kind, itemId) pair.
export function essentialItemFk(kind: EssentialKind, itemId: string) {
	return {
		kind,
		bathroomVariantId: kind === 'Bathroom' ? itemId : null,
		electronicId: kind === 'Electronic' ? itemId : null,
		documentId: kind === 'Document' ? itemId : null,
	};
}
