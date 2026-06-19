'use client';

import type { Brand, Clothing, ClothingType } from '@/generated/prisma/client';

import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { generateClothingName } from '@/lib/generate-clothing-name';

import { EmptyList } from '../../../../components/empty-list';
import { DeleteClothingDialog, EditClothingDialog } from './clothing-dialogs';

interface WardrobeListProps {
	brands: Brand[];
	types: (ClothingType & { clothes: Clothing[] })[];
}

export function WardrobeList({ brands, types }: WardrobeListProps) {
	if (types.filter((type) => type.clothes.length !== 0).length === 0)
		return (
			<EmptyList
				main="You have no items in your wardrobe"
				sub="You can create one by clicking the Add Clothing button in the top right corner."
			/>
		);
	return (
		<div className="flex flex-1 flex-col gap-8">
			{types
				.filter((type) => type.clothes.length !== 0)
				.map((type) => (
					<div>
						<h3 className="mb-2 text-xl font-bold">{type.name}</h3>
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
							{type.clothes.map((clothing) => (
								<Card key={clothing.id} className="flex flex-col">
									<CardHeader className="flex-1">
										<CardTitle>{generateClothingName(clothing)}</CardTitle>
										<CardDescription></CardDescription>
									</CardHeader>
									<CardFooter className="justify-between">
										<DeleteClothingDialog clothing={clothing} />
										<EditClothingDialog
											clothing={clothing}
											brands={brands}
											types={types}
										/>
									</CardFooter>
								</Card>
							))}
						</div>
					</div>
				))}
		</div>
	);
}
