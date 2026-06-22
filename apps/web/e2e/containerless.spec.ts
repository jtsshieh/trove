import { execSync } from 'node:child_process';

import { expect, test, type Page } from '@playwright/test';

import { dndDrag } from './helpers/dnd';

test.use({ viewport: { width: 1366, height: 2200 } });

test.beforeEach(async ({ page }) => {
	execSync('npx tsx e2e/reset-and-seed.ts', { stdio: 'ignore' });
	await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function gotoBoard(page: Page, path: string): Promise<void> {
	await page.goto('/trip-planner');
	const href = await page
		.locator('a:has-text("Open")')
		.first()
		.getAttribute('href');
	if (!href) throw new Error('no seeded trip');
	await page.goto(`${href}${path}`);
	await page.waitForLoadState('networkidle').catch(() => {});
}

async function switchTripMode(page: Page, mode: string): Promise<void> {
	await page.locator('nav').getByRole('combobox').first().click();
	await page.getByRole('option', { name: mode }).click();
	await page.waitForLoadState('networkidle').catch(() => {});
}

test('a containerless item is packed directly into a suitcase and listed under its checklist', async ({
	page,
}) => {
	// 1. Mark the Hoodie containerless on the containers board.
	await gotoBoard(page, '/containers');
	const containerless = page.getByTestId('containerless-card');
	await expect(containerless).toBeVisible();
	await dndDrag(
		page,
		page.getByTestId('pool').getByText('Black Uniqlo Hoodie'),
		containerless,
	);
	await page.waitForTimeout(1200);
	await page.reload();
	await expect(page.getByTestId('containerless-card')).toContainText('Hoodie');

	// 2. It surfaces in the luggage pool as a direct item; drag it into Carry-on.
	await gotoBoard(page, '/luggage');
	const direct = page
		.getByTestId('luggage-pool')
		.locator('[data-testid="luggage-direct-item"][data-name="Black Uniqlo Hoodie"]');
	await expect(direct).toBeVisible();
	const carryOn = page.locator(
		'[data-testid="suitcase-card"][data-name="Carry-on"]',
	);
	await dndDrag(page, direct, carryOn);
	await page.waitForTimeout(1200);
	await page.reload();
	await expect(
		page.locator('[data-testid="suitcase-card"][data-name="Carry-on"]'),
	).toContainText('Hoodie');

	// 3. In Pack mode the luggage checklist lists the Hoodie UNDER the Carry-on bag.
	await switchTripMode(page, 'Packing');
	await gotoBoard(page, '/luggage');
	await expect(
		page.locator(
			'[data-testid="luggage-direct-pack-item"][data-name="Black Uniqlo Hoodie"]',
		),
	).toBeVisible();

	// 4. There is NO separate containerless checklist on the containers pack page.
	await gotoBoard(page, '/containers');
	await expect(page.getByText('Black Uniqlo Hoodie')).toHaveCount(0);
});
