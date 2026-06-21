import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client';
import { UserRole } from '../src/generated/prisma/enums';

/**
 * Production seed. Clothing types are now chosen in the first-run setup wizard and
 * managed in the Admin app, so this no longer seeds reference data. It only
 * guarantees the instance has an admin:
 *   - fresh DB (no users): nothing to do — the first admin is created via /setup;
 *   - DB that predates the `role` column (all users defaulted to USER): promote the
 *     oldest user so the instance isn't locked out (/setup is disabled once any user
 *     exists). Idempotent — safe to run on every deploy.
 */

const prisma = new PrismaClient({
	adapter: new PrismaPg(process.env.DATABASE_URL!),
});

export async function runProdSeed() {
	const userCount = await prisma.user.count();
	if (userCount === 0) {
		console.log('no users yet — first admin is created via /setup');
		return;
	}
	const adminCount = await prisma.user.count({
		where: { role: UserRole.ADMIN },
	});
	if (adminCount > 0) {
		console.log('admin already present');
		return;
	}
	const oldest = await prisma.user.findFirst({ orderBy: { id: 'asc' } });
	if (oldest) {
		await prisma.user.update({
			where: { id: oldest.id },
			data: { role: UserRole.ADMIN },
		});
		console.log(`promoted "${oldest.username}" to ADMIN (no admin existed)`);
	}
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
