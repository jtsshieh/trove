import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'argon2';
import { startOfDay } from 'date-fns';
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
	const password = await hash('jtsshieh');
	const user = await prisma.user.upsert({
		where: { username: 'jtsshieh' },
		update: { password, role: UserRole.ADMIN },
		create: { username: 'jtsshieh', password, role: UserRole.ADMIN },
	});
	console.log('seeded dev user (jtsshieh)');

	// Brands + clothing types are now per-user — create them owned by the dev user.
	for (const type of clothingTypes) {
		await prisma.clothingType.upsert({
			where: { userId_name: { userId: user.id, name: type.name } },
			update: { category: type.category },
			create: { ...type, userId: user.id },
		});
	}
	console.log(`seeded ${clothingTypes.length} clothing types`);

	for (const name of brands) {
		await prisma.brand.upsert({
			where: { userId_name: { userId: user.id, name } },
			update: {},
			create: { name, userId: user.id },
		});
	}
	console.log(`seeded ${brands.length} brands`);

	// ——— Catalog the dev user owns (idempotent by name/attributes) ———
	async function ensureLuggage(name: string, order: string, quantity = 1) {
		const found = await prisma.luggage.findFirst({
			where: { userId: user.id, name },
		});
		return (
			found ??
			(await prisma.luggage.create({
				data: { name, order, quantity, userId: user.id },
			}))
		);
	}
	async function ensureContainer(
		name: string,
		type: ContainerType,
		order: string,
		quantity = 1,
	) {
		const found = await prisma.container.findFirst({
			where: { userId: user.id, name },
		});
		return (
			found ??
			(await prisma.container.create({
				data: { name, type, order, quantity, userId: user.id },
			}))
		);
	}
	// Essentials share a single per-user lexorank scope (mirrors clothing) so the
	// closet grid + trip picker render in a stable, drag-reorderable order.
	let essentialRank = LexoRank.middle();
	async function ensureEssential(name: string, category: EssentialCategory) {
		const found = await prisma.essential.findFirst({
			where: { userId: user.id, name },
		});
		return (
			found ??
			(await prisma.essential.create({
				data: {
					name,
					category,
					order: (essentialRank = essentialRank.genNext()).toString(),
					userId: user.id,
				},
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
					brandName: c.brandName,
					typeName: c.typeName,
					color: c.color,
					quantity: c.quantity ?? 1,
					order: (clothingRank = clothingRank.genNext()).toString(),
					user: { connect: { id: user.id } },
					// Brands/types are seeded above for this user — connect by composite.
					brand: {
						connect: { userId_name: { userId: user.id, name: c.brandName } },
					},
					type: {
						connect: { userId_name: { userId: user.id, name: c.typeName } },
					},
				},
			}))
		);
	}

	let lr = LexoRank.middle();
	// Carry-on owns 3 so the trip can hold multiple Carry-on suitcases (quantity flow).
	await ensureLuggage('Carry-on', (lr = lr.genNext()).toString(), 3);
	await ensureLuggage('Weekender Duffel', (lr = lr.genNext()).toString());
	let cr = LexoRank.middle();
	await ensureContainer(
		'Toiletry Pouch',
		ContainerType.Essentials,
		(cr = cr.genNext()).toString(),
	);
	// Packing Cube owns 3 so the trip can hold multiple Packing Cubes (quantity flow).
	await ensureContainer(
		'Packing Cube',
		ContainerType.Clothes,
		(cr = cr.genNext()).toString(),
		3,
	);

	await ensureEssential('Toothbrush', EssentialCategory.Toiletry);
	// A 2nd Toiletry so the closet + trip essentials have same-category items to reorder.
	await ensureEssential('Shampoo', EssentialCategory.Toiletry);
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
	// A 2nd Chinos so the wardrobe + trip closet panel have same-type items whose
	// manual order can be reordered and verified (Chinos avoids the count assertions
	// other specs make on Hoodie/T-shirt/Jeans).
	await ensureClothing({
		brandName: 'Uniqlo',
		typeName: 'Chinos',
		color: 'Gray',
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
		// The board derives day buckets with date-fns eachDayOfInterval (local
		// midnight) and sends that exact instant when creating/moving provisions, so
		// store the seed's day-placements at the same local-midnight value rather than
		// the raw UTC trip.start — otherwise day-scoped queries (e.g. the day's last
		// entry rank) wouldn't match these rows.
		const day0 = startOfDay(trip.start);
		let dr = LexoRank.middle();
		await prisma.clothingProvision.createMany({
			data: [
				{
					tripId: trip.id,
					clothingId: hoodie.id,
					section: ProvisionSection.Day,
					day: day0,
					dayOrder: (dr = dr.genNext()).toString(),
				},
				{
					tripId: trip.id,
					clothingId: tee.id,
					section: ProvisionSection.Day,
					day: day0,
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
				data: {
					tripId: trip.id,
					containerId: cube.id,
					tripOrder: LexoRank.middle().toString(),
				},
			});
		}
		if (carryOn) {
			await prisma.luggageProvision.create({
				data: {
					tripId: trip.id,
					luggageId: carryOn.id,
					tripOrder: LexoRank.middle().toString(),
				},
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
