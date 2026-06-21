import { execSync } from 'node:child_process';

/** Reset the dev DB to a clean seeded state before the suite (keeps the user). */
export default function globalSetup() {
	execSync('npx tsx e2e/reset-and-seed.ts', { stdio: 'inherit' });
}
