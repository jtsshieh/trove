import { Box, Layers, Shirt } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { getCurrentUserSafe } from '@/lib/auth';
import { prisma } from '@/lib/db.server';

export default async function ClosetOverview() {
	const user = await getCurrentUserSafe();
	const [clothing, outfits, luggage, containers, brands, types] =
		await Promise.all([
			prisma.clothing.count({ where: { userId: user.id } }),
			prisma.outfit.count({ where: { userId: user.id } }),
			prisma.luggage.count({ where: { userId: user.id } }),
			prisma.container.count({ where: { userId: user.id } }),
			prisma.brand.count({ where: { userId: user.id } }),
			prisma.clothingType.count({ where: { userId: user.id } }),
		]);

	const cards = [
		{
			name: 'Clothing',
			href: '/closet/clothing',
			icon: Shirt,
			count: clothing,
			unit: clothing === 1 ? 'piece' : 'pieces',
			sub: `${types} types · ${brands} brands`,
		},
		{
			name: 'Outfits',
			href: '/closet/outfits',
			icon: Layers,
			count: outfits,
			unit: outfits === 1 ? 'outfit' : 'outfits',
			sub: 'saved outfits',
		},
		{
			name: 'Packing Gear',
			href: '/closet/packing-gear',
			icon: Box,
			count: luggage + containers,
			unit: 'items',
			sub: `${luggage} luggage · ${containers} containers`,
		},
	] as const;

	return (
		<div className="mx-auto w-full max-w-screen-lg">
			<div className="mb-6">
				<h1 className="text-3xl font-bold">Closet</h1>
				<p className="text-neutral-600">Everything you own, at a glance.</p>
			</div>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				{cards.map((c) => (
					<Link key={c.href} href={c.href} className="group">
						<Card className="hover:border-brand h-full transition-colors group-hover:shadow-sm">
							<CardHeader>
								<div className="mb-1 flex items-center justify-between">
									<c.icon className="text-brand size-7" />
									<span className="text-3xl font-bold tabular-nums">
										{c.count}
									</span>
								</div>
								<CardTitle>
									{c.name}{' '}
									<span className="text-sm font-normal text-neutral-500">
										{c.unit}
									</span>
								</CardTitle>
								<CardDescription>{c.sub}</CardDescription>
							</CardHeader>
						</Card>
					</Link>
				))}
			</div>
		</div>
	);
}
