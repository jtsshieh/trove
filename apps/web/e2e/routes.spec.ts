import { execSync } from 'node:child_process';

import { expect, test, type Page } from '@playwright/test';

// Visits every page route and asserts it renders without a runtime/page error or
// a meaningful console error. This is the "every path loads" guarantee on top of
// the per-feature flow specs.

const BENIGN = [
	/scroll-behavior/i,
	/React DevTools/i,
	/hydration-mismatch is deprecated/i,
	/Fast Refresh/i,
	/\[Fast Refresh\]/i,
	// next/image optimization warnings for the MinIO-proxied images are not bugs.
	/Image with src .* has either width or height modified/i,
];

test.beforeEach(async ({ page }) => {
	execSync('npx tsx e2e/reset-and-seed.ts', { stdio: 'ignore' });
	await page.emulateMedia({ reducedMotion: 'reduce' });
});

function trackErrors(page: Page): string[] {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
	page.on('console', (m) => {
		if (m.type() === 'error') errors.push(`CONSOLE: ${m.text()}`);
	});
	return errors;
}

async function visit(page: Page, path: string): Promise<void> {
	await page.goto(path);
	await page.waitForLoadState('networkidle').catch(() => {});
	await page.waitForTimeout(300);
}

test('every main route renders without errors', async ({ page }) => {
	const errors = trackErrors(page);
	const routes = [
		'/trips',
		'/trips/templates',
		'/account',
		'/closet/clothing',
		'/closet/clothing/brands',
		'/closet/outfits',
		'/closet/packing-gear/containers',
		'/closet/packing-gear/luggage',
		'/bathroom',
		'/electronics',
		'/documents',
	];
	for (const route of routes) {
		errors.push(`\n----- ${route} -----`);
		await visit(page, route);
		// Something rendered (no blank error page).
		await expect(page.locator('h1').first()).toBeVisible();
	}

	const meaningful = errors.filter(
		(e) => !e.includes('-----') && !BENIGN.some((b) => b.test(e)),
	);
	expect(meaningful, `\n${meaningful.join('\n')}\n`).toEqual([]);
});

test('every trip-viewer route renders without errors', async ({ page }) => {
	const errors = trackErrors(page);

	await page.goto('/trips');
	const href = await page
		.locator('a:has-text("Open")')
		.first()
		.getAttribute('href');
	if (!href) throw new Error('no seeded trip');

	for (const sub of [
		'',
		'/clothing',
		'/essentials',
		'/containers',
		'/luggage',
		'/manage',
		'/search',
	]) {
		errors.push(`\n----- ${href}${sub} -----`);
		await visit(page, `${href}${sub}`);
		await expect(page.locator('h1, h2').first()).toBeVisible();
	}

	const meaningful = errors.filter(
		(e) => !e.includes('-----') && !BENIGN.some((b) => b.test(e)),
	);
	expect(meaningful, `\n${meaningful.join('\n')}\n`).toEqual([]);
});

test('packing-gear index redirects into a sub-tab', async ({ page }) => {
	await page.goto('/closet/packing-gear');
	await page.waitForLoadState('networkidle').catch(() => {});
	await expect(page).toHaveURL(/\/closet\/packing-gear\/(containers|luggage)/);
});
