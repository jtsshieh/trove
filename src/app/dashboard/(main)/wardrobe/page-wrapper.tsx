'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

import { CreateClothingDialog } from './clothing-dialogs';
import { brandsQueryOptions, clothingTypesQueryOptions } from './_data/queries';
import { WardrobeList } from './wardrobe-list';

export function WardrobeContent() {
	const { data: brands } = useSuspenseQuery(brandsQueryOptions);
	const { data: types } = useSuspenseQuery(clothingTypesQueryOptions);

	return (
		<>
			<div className="mb-4 flex items-center justify-between gap-4 border-b pb-4">
				<div className="flex-1">
					<h1 className="text-3xl font-bold">Wardrobe</h1>
					<h2 className="text-base text-neutral-600">
						These are the pieces of clothing currently registered to the system.
					</h2>
				</div>
				<CreateClothingDialog brands={brands} types={types} />
			</div>
			<WardrobeList brands={brands} types={types} />
		</>
	);
}
