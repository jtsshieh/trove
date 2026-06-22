import { execSync } from 'node:child_process';

import { expect, test, type Page } from '@playwright/test';

import { dndDrag } from './helpers/dnd';

// The boards are tall; give them room so off-screen drop zones are reachable.
test.use({ viewport: { width: 1366, height: 2200 } });

// Each test starts from the clean seeded baseline so they are order-independent.
// The reset keeps the user row, so the logged-in session stays valid.
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

test('clothing — drag a piece between days', async ({ page }) => {
	await gotoBoard(page, '/clothing');
	await expect(page.getByTestId('day-column').nth(0)).toContainText('Hoodie');

	await dndDrag(
		page,
		page.getByText('Black Uniqlo Hoodie').first(),
		page.getByTestId('day-column').nth(1),
	);
	await page.waitForTimeout(1200);
	await page.reload();

	await expect(page.getByTestId('day-column').nth(1)).toContainText('Hoodie');
	await expect(page.getByTestId('day-column').nth(0)).not.toContainText(
		'Hoodie',
	);
});

test('clothing — drag a piece from Universal to Backup', async ({ page }) => {
	await gotoBoard(page, '/clothing');
	const universal = page.locator(
		'[data-testid="section-lane"][data-section="Universal"]',
	);
	const backup = page.locator(
		'[data-testid="section-lane"][data-section="Backup"]',
	);
	// The seeded White Nike Socks live in the Universal lane.
	await expect(universal).toContainText('Socks');

	// Universal and Backup sit side-by-side, so this is a short, reliable drag.
	await dndDrag(
		page,
		universal.locator('[data-testid="piece"][data-name="White Nike Socks"]'),
		backup,
	);
	await page.waitForTimeout(1200);
	await page.reload();

	await expect(
		page.locator('[data-testid="section-lane"][data-section="Backup"]'),
	).toContainText('Socks');
	await expect(
		page.locator('[data-testid="section-lane"][data-section="Universal"]'),
	).not.toContainText('Socks');
});

test('clothing — switch to the calendar view', async ({ page }) => {
	await gotoBoard(page, '/clothing');
	await page.getByRole('tab', { name: 'Calendar' }).click();
	await expect(page.getByTestId('calendar-grid')).toBeVisible();
	await expect(page.getByText('Black Uniqlo Hoodie').first()).toBeVisible();
});

test('containers — drag a pool item into a container', async ({ page }) => {
	await gotoBoard(page, '/containers');
	const cube = page.locator(
		'[data-testid="container-card"][data-name="Packing Cube"]',
	);
	await expect(cube).toBeVisible();

	await dndDrag(page, page.getByText('Black Uniqlo Hoodie').first(), cube);
	await page.waitForTimeout(1200);
	await page.reload();

	await expect(
		page.locator('[data-testid="container-card"][data-name="Packing Cube"]'),
	).toContainText('Hoodie');
});

test('luggage — drag a container into a suitcase', async ({ page }) => {
	await gotoBoard(page, '/luggage');
	const suitcase = page.locator(
		'[data-testid="suitcase-card"][data-name="Carry-on"]',
	);
	await expect(suitcase).toBeVisible();

	await dndDrag(page, page.getByText('Packing Cube').first(), suitcase);
	await page.waitForTimeout(1200);
	await page.reload();

	await expect(
		page.locator('[data-testid="suitcase-card"][data-name="Carry-on"]'),
	).toContainText('Packing Cube');
});
