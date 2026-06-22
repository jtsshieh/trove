import { execSync } from 'node:child_process';

import { expect, test, type Locator, type Page } from '@playwright/test';

import { dndDrag } from './helpers/dnd';

test.use({ viewport: { width: 1366, height: 2200 } });

test.beforeEach(async ({ page }) => {
	execSync('npx tsx e2e/reset-and-seed.ts', { stdio: 'ignore' });
	await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function gotoTripEssentials(page: Page): Promise<void> {
	await page.goto('/trip-planner');
	const href = await page
		.locator('a:has-text("Open")')
		.first()
		.getAttribute('href');
	if (!href) throw new Error('no seeded trip');
	await page.goto(`${href}/essentials`);
	await page.waitForLoadState('networkidle').catch(() => {});
}

/** The rendered (document) order of the named tiles in a locator set. */
async function nameOrder(locator: Locator): Promise<string[]> {
	return locator.evaluateAll((els) =>
		els.map((e) => e.getAttribute('data-name') ?? ''),
	);
}

test('closet essentials can be reordered and the order persists', async ({
	page,
}) => {
	await page.goto('/closet/essentials');
	await page.waitForLoadState('networkidle').catch(() => {});

	const cards = page.locator('[data-testid="essential-card"]');
	let order = await nameOrder(cards);
	// Seeded order: Toothbrush before Shampoo.
	expect(order.indexOf('Toothbrush')).toBeLessThan(order.indexOf('Shampoo'));

	// Drag Shampoo ahead of Toothbrush.
	await dndDrag(
		page,
		page.locator('[data-testid="essential-card"][data-name="Shampoo"]'),
		page.locator('[data-testid="essential-card"][data-name="Toothbrush"]'),
	);
	await page.waitForTimeout(1200);
	await page.reload();
	await page.waitForLoadState('networkidle').catch(() => {});

	order = await nameOrder(page.locator('[data-testid="essential-card"]'));
	expect(order.indexOf('Shampoo')).toBeLessThan(order.indexOf('Toothbrush'));
});

test('trip essentials reorder within a category lane persists', async ({
	page,
}) => {
	await gotoTripEssentials(page);

	// Add two Toiletries to the trip via the header picker.
	await page.getByRole('button', { name: 'Add', exact: true }).click();
	const search = page.getByPlaceholder('Search essentials…');
	await expect(search).toBeVisible();
	for (const name of ['Toothbrush', 'Shampoo']) {
		await search.fill(name);
		await page.getByRole('option', { name }).click();
	}
	await page.getByRole('button', { name: /^Add \d+$/ }).click();
	await expect(search).toBeHidden();
	await page.waitForTimeout(600);
	await page.reload();
	await page.waitForLoadState('networkidle').catch(() => {});

	const lane = () =>
		page.locator('[data-testid="category-lane"][data-category="Toiletry"]');
	const tiles = () => lane().locator('[data-testid="essential-tile"]');
	await expect(tiles()).toHaveCount(2);
	let order = await nameOrder(tiles());
	expect(order.indexOf('Toothbrush')).toBeLessThan(order.indexOf('Shampoo'));

	// Reorder: drag Shampoo above Toothbrush.
	await dndDrag(
		page,
		lane().locator('[data-testid="essential-tile"][data-name="Shampoo"]'),
		lane().locator('[data-testid="essential-tile"][data-name="Toothbrush"]'),
	);
	await page.waitForTimeout(1200);
	await page.reload();
	await page.waitForLoadState('networkidle').catch(() => {});

	order = await nameOrder(tiles());
	expect(order.indexOf('Shampoo')).toBeLessThan(order.indexOf('Toothbrush'));
});
