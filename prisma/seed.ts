import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'argon2';
import { LexoRank } from 'lexorank';

import { PrismaClient } from '../src/generated/prisma/client';
import {
	ClothingCategory,
	ContainerType,
	EssentialCategory,
} from '../src/generated/prisma/enums';

const prisma = new PrismaClient({
	adapter: new PrismaPg(process.env.DATABASE_URL!),
});

const clothingTypes: { name: string; category: ClothingCategory }[] = [
	// Tops
	{ name: 'T-shirt', category: ClothingCategory.Top },
	{ name: 'Long Sleeve Shirt', category: ClothingCategory.Top },
	{ name: 'Tank Top', category: ClothingCategory.Top },
	{ name: 'Polo', category: ClothingCategory.Top },
	{ name: 'Dress Shirt', category: ClothingCategory.Top },
	{ name: 'Flannel', category: ClothingCategory.Top },
	{ name: 'Hoodie', category: ClothingCategory.Top },
	{ name: 'Sweater', category: ClothingCategory.Top },
	{ name: 'Sweatshirt', category: ClothingCategory.Top },
	{ name: 'Jacket', category: ClothingCategory.Top },
	{ name: 'Coat', category: ClothingCategory.Top },
	// Bottoms
	{ name: 'Jeans', category: ClothingCategory.Bottom },
	{ name: 'Chinos', category: ClothingCategory.Bottom },
	{ name: 'Dress Pants', category: ClothingCategory.Bottom },
	{ name: 'Shorts', category: ClothingCategory.Bottom },
	{ name: 'Sweatpants', category: ClothingCategory.Bottom },
	{ name: 'Joggers', category: ClothingCategory.Bottom },
	{ name: 'Leggings', category: ClothingCategory.Bottom },
	{ name: 'Skirt', category: ClothingCategory.Bottom },
	// Accessories
	{ name: 'Socks', category: ClothingCategory.Accessory },
	{ name: 'Underwear', category: ClothingCategory.Accessory },
	{ name: 'Hat', category: ClothingCategory.Accessory },
	{ name: 'Beanie', category: ClothingCategory.Accessory },
	{ name: 'Belt', category: ClothingCategory.Accessory },
	{ name: 'Scarf', category: ClothingCategory.Accessory },
	{ name: 'Gloves', category: ClothingCategory.Accessory },
	{ name: 'Tie', category: ClothingCategory.Accessory },
	{ name: 'Sunglasses', category: ClothingCategory.Accessory },
];

const brands = ['Uniqlo', 'Nike', 'Adidas', 'Patagonia', 'Away', "Levi's"];

async function main() {
	for (const type of clothingTypes) {
		await prisma.clothingType.upsert({
			where: { name: type.name },
			update: { category: type.category },
			create: type,
		});
	}
	console.log(`seeded ${clothingTypes.length} clothing types`);

	for (const name of brands) {
		await prisma.brand.upsert({
			where: { name },
			update: {},
			create: { name },
		});
	}
	console.log(`seeded ${brands.length} brands`);

	const password = await hash('jtsshieh');
	const user = await prisma.user.upsert({
		where: { username: 'jtsshieh' },
		update: { password },
		create: { username: 'jtsshieh', password },
	});
	console.log('seeded dev user (jtsshieh)');

	// Base items the dev user can provision into trips (idempotent by name).
	const luggage = await prisma.luggage.findFirst({
		where: { userId: user.id, name: 'Seed Carry-on' },
	});
	if (!luggage) {
		await prisma.luggage.create({
			data: {
				name: 'Seed Carry-on',
				order: LexoRank.middle().toString(),
				userId: user.id,
			},
		});
	}

	const container = await prisma.container.findFirst({
		where: { userId: user.id, name: 'Seed Toiletry Pouch' },
	});
	if (!container) {
		await prisma.container.create({
			data: {
				name: 'Seed Toiletry Pouch',
				type: ContainerType.Essentials,
				order: LexoRank.middle().toString(),
				userId: user.id,
			},
		});
	}

	const essential = await prisma.essential.findFirst({
		where: { userId: user.id, name: 'Seed Toothbrush' },
	});
	if (!essential) {
		await prisma.essential.create({
			data: {
				name: 'Seed Toothbrush',
				category: EssentialCategory.Toiletry,
				userId: user.id,
			},
		});
	}

	const clothing = await prisma.clothing.findFirst({
		where: {
			userId: user.id,
			brandName: 'Uniqlo',
			typeName: 'Hoodie',
			color: 'Black',
		},
	});
	if (!clothing) {
		await prisma.clothing.create({
			data: {
				brandName: 'Uniqlo',
				typeName: 'Hoodie',
				color: 'Black',
				userId: user.id,
			},
		});
	}
	console.log('seeded base provisionable items');
}

main()
	.then(() => process.exit(0))
	.catch((e) => {
		console.error(e);
		process.exit(1);
	});
