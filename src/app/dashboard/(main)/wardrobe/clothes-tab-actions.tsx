'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

import { BulkAddDialog } from './bulk-add-dialog';
import { CreateClothingDialog } from './clothing-dialogs';
import { brandsQueryOptions, clothingTypesQueryOptions } from './_data/queries';

/** Clothes tab-bar actions: bulk add plus the Add Clothing trigger. */
export function ClothesTabActions() {
	const { data: brands } = useSuspenseQuery(brandsQueryOptions);
	const { data: types } = useSuspenseQuery(clothingTypesQueryOptions);

	return (
		<>
			<BulkAddDialog brands={brands} types={types} />
			<CreateClothingDialog brands={brands} types={types} />
		</>
	);
}
