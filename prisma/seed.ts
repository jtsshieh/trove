import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'argon2';
import { LexoRank } from 'lexorank';

import { PrismaClient } from '../src/generated/prisma/client';
import {
	ClothingCategory,
	ContainerType,
	EssentialCategory,
	ProvisionSection,
	UserRole,
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

export async function runSeed() {
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
		update: { password, role: UserRole.ADMIN },
		create: { username: 'jtsshieh', password, role: UserRole.ADMIN },
	});
	console.log('seeded dev user (jtsshieh)');

	// ——— Catalog the dev user owns (idempotent by name/attributes) ———
	async function ensureLuggage(name: string, order: string) {
		const found = await prisma.luggage.findFirst({
			where: { userId: user.id, name },
		});
		return (
			found ??
			(await prisma.luggage.create({ data: { name, order, userId: user.id } }))
		);
	}
	async function ensureContainer(
		name: string,
		type: ContainerType,
		order: string,
	) {
		const found = await prisma.container.findFirst({
			where: { userId: user.id, name },
		});
		return (
			found ??
			(await prisma.container.create({
				data: { name, type, order, userId: user.id },
			}))
		);
	}
	async function ensureEssential(name: string, category: EssentialCategory) {
		const found = await prisma.essential.findFirst({
			where: { userId: user.id, name },
		});
		return (
			found ??
			(await prisma.essential.create({
				data: { name, category, userId: user.id },
			}))
		);
	}
	// Manual wardrobe order is a single per-user lexorank scope; seed pieces get
	// incrementing ranks in creation order so drag-to-reorder has well-spaced values.
	let clothingRank = LexoRank.middle();
	async function ensureClothing(c: {
		brandName: string;
		typeName: string;
		color: string;
		quantity?: number;
	}) {
		const found = await prisma.clothing.findFirst({
			where: {
				userId: user.id,
				brandName: c.brandName,
				typeName: c.typeName,
				color: c.color,
				brandLine: null,
				modifier: null,
			},
		});
		return (
			found ??
			(await prisma.clothing.create({
				data: {
					...c,
					quantity: c.quantity ?? 1,
					order: (clothingRank = clothingRank.genNext()).toString(),
					userId: user.id,
				},
			}))
		);
	}

	let lr = LexoRank.middle();
	await ensureLuggage('Carry-on', (lr = lr.genNext()).toString());
	await ensureLuggage('Weekender Duffel', (lr = lr.genNext()).toString());
	let cr = LexoRank.middle();
	await ensureContainer(
		'Toiletry Pouch',
		ContainerType.Essentials,
		(cr = cr.genNext()).toString(),
	);
	await ensureContainer(
		'Packing Cube',
		ContainerType.Clothes,
		(cr = cr.genNext()).toString(),
	);

	await ensureEssential('Toothbrush', EssentialCategory.Toiletry);
	await ensureEssential('Phone Charger', EssentialCategory.Electronic);
	await ensureEssential('Passport', EssentialCategory.Document);

	const hoodie = await ensureClothing({
		brandName: 'Uniqlo',
		typeName: 'Hoodie',
		color: 'Black',
	});
	const tee = await ensureClothing({
		brandName: 'Uniqlo',
		typeName: 'T-shirt',
		color: 'White',
	});
	const jeans = await ensureClothing({
		brandName: "Levi's",
		typeName: 'Jeans',
		color: 'Blue',
	});
	await ensureClothing({
		brandName: 'Uniqlo',
		typeName: 'Chinos',
		color: 'Beige',
	});
	const socks = await ensureClothing({
		brandName: 'Nike',
		typeName: 'Socks',
		color: 'White',
		quantity: 12,
	});
	console.log('seeded catalog');

	// Reset display prefs to defaults on every (re)seed so e2e runs are deterministic
	// — without this, a display/piece-size/calendar test's change persists across the
	// per-test reset (which keeps the settings row) and breaks later text assertions.
	await prisma.userSettings.upsert({
		where: { userId: user.id },
		update: {
			displayMode: 'Both',
			defaultProvisionView: 'List',
			pieceSize: 'Compact',
		},
		create: { userId: user.id },
	});

	const existingOutfit = await prisma.outfit.findFirst({
		where: { userId: user.id, name: 'Casual Day' },
	});
	if (!existingOutfit) {
		let oi = LexoRank.middle();
		await prisma.outfit.create({
			data: {
				name: 'Casual Day',
				order: LexoRank.middle().toString(),
				userId: user.id,
				items: {
					create: [
						{ clothingId: tee.id, order: (oi = oi.genNext()).toString() },
						{ clothingId: jeans.id, order: (oi = oi.genNext()).toString() },
					],
				},
			},
		});
	}

	// Trip + a couple of provisions so the boards have draggable data.
	let trip = await prisma.trip.findFirst({
		where: { userId: user.id, name: 'Test Trip' },
	});
	if (!trip) {
		trip = await prisma.trip.create({
			data: {
				name: 'Test Trip',
				start: new Date('2026-07-01T00:00:00Z'),
				end: new Date('2026-07-07T00:00:00Z'),
				userId: user.id,
			},
		});
	}
	const provisionCount = await prisma.clothingProvision.count({
		where: { tripId: trip.id },
	});
	if (provisionCount === 0) {
		let dr = LexoRank.middle();
		await prisma.clothingProvision.createMany({
			data: [
				{
					tripId: trip.id,
					clothingId: hoodie.id,
					section: ProvisionSection.Day,
					day: trip.start,
					dayOrder: (dr = dr.genNext()).toString(),
				},
				{
					tripId: trip.id,
					clothingId: tee.id,
					section: ProvisionSection.Day,
					day: trip.start,
					dayOrder: (dr = dr.genNext()).toString(),
				},
				{
					tripId: trip.id,
					clothingId: socks.id,
					section: ProvisionSection.Universal,
					day: null,
					dayOrder: LexoRank.middle().toString(),
				},
			],
		});

		// Provision a container + a suitcase so those boards have cards to pack into.
		const cube = await prisma.container.findFirst({
			where: { userId: user.id, name: 'Packing Cube' },
		});
		const carryOn = await prisma.luggage.findFirst({
			where: { userId: user.id, name: 'Carry-on' },
		});
		if (cube) {
			await prisma.containerProvision.create({
				data: { tripId: trip.id, containerId: cube.id },
			});
		}
		if (carryOn) {
			await prisma.luggageProvision.create({
				data: { tripId: trip.id, luggageId: carryOn.id },
			});
		}
	}

	// Demo the per-trip "bringing" override: of the 12 owned White Nike Socks,
	// only 6 are coming on this trip (absent rows default to bring-all = quantity).
	await prisma.tripClothingBring.upsert({
		where: { tripId_clothingId: { tripId: trip.id, clothingId: socks.id } },
		update: { bringing: 6 },
		create: { tripId: trip.id, clothingId: socks.id, bringing: 6 },
	});
	console.log('seeded outfit + settings + trip + provisions');
}

// Auto-run only when invoked directly (e.g. `prisma db seed`), not when imported
// (the path separator guards against matching e.g. reset-and-seed.ts).
if (process.argv[1] && /[/\\]seed\.ts$/.test(process.argv[1])) {
	runSeed()
		.then(() => process.exit(0))
		.catch((e) => {
			console.error(e);
			process.exit(1);
		});
}
