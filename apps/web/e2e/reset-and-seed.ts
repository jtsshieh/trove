import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { runSeed } from '../prisma/seed';
import { PrismaClient } from '../src/generated/prisma/client';

/**
 * Fast, deterministic e2e reset in one process: wipe trip + catalog data but KEEP
 * users/passkeys/settings so the logged-in session (a JWT bound to the user id)
 * stays valid, then reseed.
 */
const prisma = new PrismaClient({
	adapter: new PrismaPg(process.env.DATABASE_URL!),
});

async function main() {
	await prisma.$executeRawUnsafe(
		'TRUNCATE TABLE "trips", "clothes", "bathroom_products", "electronics", "documents", "containers", "luggage", "outfits", "brands", "clothing_types", "essential_groups" RESTART IDENTITY CASCADE',
	);
	await prisma.$disconnect();
	await runSeed();
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
