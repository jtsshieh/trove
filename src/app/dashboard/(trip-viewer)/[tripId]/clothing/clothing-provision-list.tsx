import { Pants, Sock, TShirt } from '@phosphor-icons/react/dist/ssr';
import type { Clothing, ClothingProvision } from '@/generated/prisma/client';
import { ClothingCategory } from '@/generated/prisma/enums';
import { format } from 'date-fns';
import { RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { generateClothingName } from '@/lib/generate-clothing-name';

import { ClothingProvisionDelete } from './delete-clothing-provision';

const provisionCategories = [
	{ category: ClothingCategory.Top, icon: <TShirt />, name: 'Tops' },
	{ category: ClothingCategory.Bottom, icon: <Pants />, name: 'Bottoms' },
	{
		category: ClothingCategory.Accessory,
		icon: <Sock />,
		name: 'Accessories',
	},
];
export function ClothingProvisionList({
	groups,
	usedClothes,
	tripId,
}: {
	groups: Record<
		string,
		Record<ClothingCategory, (ClothingProvision & { clothing: Clothing })[]>
	>;
	usedClothes: string[];
	tripId: string;
}) {
	function getNextIdx(findVal: string, curIdx: number) {
		let first: number | undefined;

		const idx = Object.entries(groups).findIndex(([, provisions], i) => {
			if (i === curIdx) return false;
			const foundVal = [
				...provisions.Top,
				...provisions.Bottom,
				...provisions.Accessory,
			].find((p) => p.clothing.id === findVal);
			if (!foundVal) return false;
			if (!first) first = i;

			if (i > curIdx) return true;
		});

		if (idx === -1) return first;
		return idx;
	}

	return (
		<div className="flex flex-col gap-4">
			{Object.entries(groups).map(([day, provisions], i) => {
				return (
					<Card key={day} id={i.toString()}>
						<CardHeader>
							<CardTitle>{format(day, 'LLL dd, y')}</CardTitle>
						</CardHeader>
						<CardContent className="grid grid-cols-3 gap-2">
							{provisionCategories.map(({ category, icon, name }) => (
								<div className="rounded-lg border p-4" key={category}>
									<p className="mb-2 flex items-center gap-2 text-lg font-bold">
										{icon} {name}
									</p>
									{provisions[category].map((provision) => (
										<div
											key={provision.id}
											className="flex items-center justify-between gap-2"
										>
											<p className="flex-1 text-sm">
												{generateClothingName(provision.clothing)}
											</p>
											{usedClothes.filter((a) => a === provision.clothing.id)
												.length > 1 && (
												<Button
													size="icon"
													variant="ghost"
													className="h-8 w-8"
													render={
														<Link
															href={`/dashboard/${tripId}/clothing#${getNextIdx(provision.clothing.id, i)}`}
														/>
													}
												>
													<RefreshCcw size={16} />
												</Button>
											)}

											<ClothingProvisionDelete provisionId={provision.id} />
										</div>
									))}
								</div>
							))}
						</CardContent>
						<CardFooter className="justify-between">
							{/*<DeleteBrandDialog brand={brand} />*/}
							{/*<EditBrandDialog brand={brand} />*/}
						</CardFooter>
					</Card>
				);
			})}
		</div>
	);
}
