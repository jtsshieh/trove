import { execSync } from 'node:child_process';

import { expect, test, type Page } from '@playwright/test';

import { dndDrag } from './helpers/dnd';

test.use({ viewport: { width: 1366, height: 2200 } });

test.beforeEach(async ({ page }) => {
	execSync('npx tsx e2e/reset-and-seed.ts', { stdio: 'ignore' });
	await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function gotoEssentials(page: Page): Promise<void> {
	await page.goto('/trips');
	const href = await page
		.locator('a:has-text("Open")')
		.first()
		.getAttribute('href');
	if (!href) throw new Error('no seeded trip');
	await page.goto(`${href}/essentials`);
	await page.waitForLoadState('networkidle').catch(() => {});
}

test('essentials board groups packed items by app (Bathroom/Electronics/Documents)', async ({
	page,
}) => {
	await gotoEssentials(page);
	// The seed packs a bathroom variant + the phone charger onto the trip.
	await expect(page.getByTestId('essential-app-lane').first()).toBeVisible();
	await expect(
		page.getByTestId('essential-tile').filter({ hasText: 'Shampoo' }).first(),
	).toBeVisible();
});

test('essentials board — add a document item from the picker persists', async ({
	page,
}) => {
	await gotoEssentials(page);

	await page.getByRole('button', { name: 'Add', exact: true }).first().click();
	const search = page.getByPlaceholder('Search items…');
	await expect(search).toBeVisible();
	await search.fill('Passport');
	await page.getByRole('option', { name: /Passport/ }).first().click();
	// Confirm the add (button reads "Add" / "Add 1").
	await page
		.getByRole('button', { name: /^Add(\s\d+)?$/ })
		.last()
		.click();
	await page.waitForTimeout(700);

	await page.reload();
	await expect(
		page.getByTestId('essential-tile').filter({ hasText: 'Passport' }).first(),
	).toBeVisible();
});

test('liquids-compliance panel flags an over-100 mL liquid packed into a carry-on', async ({
	page,
}) => {
	// The seed leaves the 250 mL Shampoo unpacked on the board. Pack it into the
	// carry-on via the proven containerless → luggage flow, then check the panel.
	await page.goto('/trips');
	const href = await page
		.locator('a:has-text("Open")')
		.first()
		.getAttribute('href');

	// 1. Containers board: mark the Shampoo containerless.
	await page.goto(`${href}/containers`);
	await page.waitForLoadState('networkidle').catch(() => {});
	await dndDrag(
		page,
		page.getByTestId('pool').getByText('Shampoo').first(),
		page.getByTestId('containerless-card'),
	);
	await page.waitForTimeout(1200);
	await page.reload();
	await expect(page.getByTestId('containerless-card')).toContainText('Shampoo');

	// 2. Luggage board: drag the Shampoo direct-item into the Carry-on.
	await page.goto(`${href}/luggage`);
	await page.waitForLoadState('networkidle').catch(() => {});
	const direct = page
		.getByTestId('luggage-pool')
		.locator('[data-testid="luggage-direct-item"]')
		.filter({ hasText: 'Shampoo' })
		.first();
	await expect(direct).toBeVisible();
	await dndDrag(
		page,
		direct,
		page.locator('[data-testid="suitcase-card"][data-name="Carry-on"]'),
	);
	await page.waitForTimeout(1200);

	// 3. Essentials board: the compliance panel flags the over-limit liquid.
	await page.goto(`${href}/essentials`);
	await page.waitForLoadState('networkidle').catch(() => {});
	const panel = page.getByTestId('liquids-compliance');
	await expect(panel).toBeVisible();
	await expect(panel).toHaveAttribute('data-status', 'over');
	await expect(panel).toContainText('Shampoo');
	await expect(panel).toContainText(/over the 100 mL/i);
});

