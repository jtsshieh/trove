import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client';
import { ClothingCategory } from '../src/generated/prisma/enums';

/**
 * Production seed: reference data only. Idempotent (upsert by name) so the deploy
 * pipeline can run it on every update. Unlike the dev seed (prisma/seed.ts) it
 * creates NO user, brands, or sample trip — accounts are registered via the app.
 */

const prisma = new PrismaClient({
	adapter: new PrismaPg(process.env.DATABASE_URL!),
});

const clothingTypes: { name: string; category: ClothingCategory }[] = [
	// Tops
	{ name: 'T-shirt', category: ClothingCategory.Top },
	{ name: 'Long Sleeve Shirt', category: ClothingCategory.Top },
	{ name: 'Polo', category: ClothingCategory.Top },
	{ name: 'Dress Shirt', category: ClothingCategory.Top },
	{ name: 'Hoodie', category: ClothingCategory.Top },
	{ name: 'Quarter Zip', category: ClothingCategory.Top },
	{ name: 'Jacket', category: ClothingCategory.Top },
	// Bottoms
	{ name: 'Jeans', category: ClothingCategory.Bottom },
	{ name: 'Chinos', category: ClothingCategory.Bottom },
	{ name: 'Dress Pants', category: ClothingCategory.Bottom },
	{ name: 'Shorts', category: ClothingCategory.Bottom },
	{ name: 'Sweatpants', category: ClothingCategory.Bottom },
	// Accessories
	{ name: 'Socks', category: ClothingCategory.Accessory },
	{ name: 'Underwear', category: ClothingCategory.Accessory },
	{ name: 'Belt', category: ClothingCategory.Accessory },
	{ name: 'Tie', category: ClothingCategory.Accessory },
	{ name: 'Sunglasses', category: ClothingCategory.Accessory },
];

export async function runProdSeed() {
	for (const type of clothingTypes) {
		await prisma.clothingType.upsert({
			where: { name: type.name },
			update: { category: type.category },
			create: type,
		});
	}
	console.log(`seeded ${clothingTypes.length} clothing types`);
}

// Auto-run only when invoked directly (e.g. `tsx prisma/seed.prod.ts`).
if (process.argv[1] && /[/\\]seed\.prod\.ts$/.test(process.argv[1])) {
	runProdSeed()
		.then(() => process.exit(0))
		.catch((e) => {
			console.error(e);
			process.exit(1);
		});
}
