import { execSync } from 'node:child_process';

import { expect, test, type Page } from '@playwright/test';

import { dndDrag } from './helpers/dnd';

test.use({ viewport: { width: 1366, height: 2200 } });

test.beforeEach(async ({ page }) => {
	execSync('npx tsx e2e/reset-and-seed.ts', { stdio: 'ignore' });
	await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function openTripCloset(page: Page): Promise<void> {
	await page.goto('/trips');
	const href = await page
		.locator('a:has-text("Open")')
		.first()
		.getAttribute('href');
	if (!href) throw new Error('no seeded trip');
	await page.goto(`${href}/clothing`);
	await page.waitForLoadState('networkidle').catch(() => {});
	const panel = page.getByTestId('closet-panel');
	// The Closet toggle (carries aria-pressed; the global nav "Closet" link does not)
	// streams in with the header — retry the click until the panel opens, so a click
	// landing before hydration doesn't no-op the test.
	const toggle = page
		.getByRole('button', { name: 'Closet' })
		.and(page.locator('[aria-pressed]'));
	await expect(async () => {
		if (!(await panel.isVisible())) await toggle.click();
		await expect(panel).toBeVisible({ timeout: 1500 });
	}).toPass({ timeout: 15000 });
}

/** The data-name order of the trip closet panel's clothing entries. */
async function closetOrder(page: Page): Promise<string[]> {
	return page
		.getByTestId('closet-panel')
		.locator('[data-testid="closet-entry"]')
		.evaluateAll((els) =>
			els.map((e) => e.getAttribute('data-name') ?? ''),
		);
}

test('wardrobe reorder is reflected in the trip closet panel', async ({
	page,
}) => {
	// Seeded order within the Chinos type is Beige then Gray.
	await openTripCloset(page);
	let order = await closetOrder(page);
	expect(order.indexOf('Beige Uniqlo Chinos')).toBeLessThan(
		order.indexOf('Gray Uniqlo Chinos'),
	);

	// Reorder in the wardrobe: drag Gray ahead of Beige.
	await page.goto('/closet/clothing');
	await page.waitForLoadState('networkidle').catch(() => {});
	const gray = page.locator(
		'[data-testid="wardrobe-card"][data-name="Gray Uniqlo Chinos"]',
	);
	const beige = page.locator(
		'[data-testid="wardrobe-card"][data-name="Beige Uniqlo Chinos"]',
	);
	await dndDrag(page, gray, beige);
	await page.waitForTimeout(1200);
	await page.reload();

	// The trip closet panel now lists Gray before Beige (order preserved).
	await openTripCloset(page);
	order = await closetOrder(page);
	expect(order.indexOf('Gray Uniqlo Chinos')).toBeLessThan(
		order.indexOf('Beige Uniqlo Chinos'),
	);
});
