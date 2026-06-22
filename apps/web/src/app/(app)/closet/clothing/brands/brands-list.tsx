'use client';

import type { Brand } from '@/generated/prisma/client';

import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

import { DeleteBrandDialog, EditBrandDialog } from './brand-dialogs';

interface BrandsListProps {
	brands: Brand[];
}

export function BrandsList({ brands }: BrandsListProps) {
	return (
		<>
			<div className="grid grid-cols-4 gap-2">
				{brands.map((brand) => (
					<Card key={brand.name}>
						<CardHeader>
							<CardTitle>{brand.name}</CardTitle>
						</CardHeader>
						<CardFooter className="justify-between">
							<DeleteBrandDialog brand={brand} />
							<EditBrandDialog brand={brand} />
						</CardFooter>
					</Card>
				))}
			</div>
		</>
	);
}
