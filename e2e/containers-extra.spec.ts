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
	await page.goto('/dashboard');
	const href = await page
		.locator('a:has-text("Open")')
		.first()
		.getAttribute('href');
	if (!href) throw new Error('no seeded trip');
	await page.goto(`${href}${path}`);
	await page.waitForLoadState('networkidle').catch(() => {});
}

test('containers — add a container to the trip via the dialog', async ({
	page,
}) => {
	await gotoBoard(page, '/containers');
	await expect(
		page.locator('[data-testid="container-card"][data-name="Toiletry Pouch"]'),
	).toHaveCount(0);

	await page.getByRole('button', { name: 'Add container' }).click();
	const dialog = page.getByRole('dialog');
	await dialog.getByText('Toiletry Pouch').click();
	await dialog.getByRole('button', { name: /^Add/ }).click();

	await expect(
		page.locator('[data-testid="container-card"][data-name="Toiletry Pouch"]'),
	).toBeVisible();

	await page.reload();
	await expect(
		page.locator('[data-testid="container-card"][data-name="Toiletry Pouch"]'),
	).toBeVisible();
});

test('containers — pack a pool item into a container then pull it back out', async ({
	page,
}) => {
	await gotoBoard(page, '/containers');
	const cube = page.locator(
		'[data-testid="container-card"][data-name="Packing Cube"]',
	);
	const pool = page.getByTestId('pool');
	await expect(cube).toBeVisible();
	await expect(pool).toContainText('Hoodie');

	// Pool -> container.
	await dndDrag(page, page.getByText('Black Uniqlo Hoodie').first(), cube);
	await page.waitForTimeout(1200);
	await page.reload();
	await expect(
		page.locator('[data-testid="container-card"][data-name="Packing Cube"]'),
	).toContainText('Hoodie');

	// Container -> back out via the tile's Remove button (the per-item unpack
	// affordance; equivalent to dragging it to the pool, but deterministic).
	await cube
		.getByRole('button', {
			name: 'Remove Black Uniqlo Hoodie from container',
			exact: true,
		})
		.click({ force: true });
	await page.waitForTimeout(800);
	await page.reload();

	await expect(page.getByTestId('pool')).toContainText('Hoodie');
	await expect(
		page.locator('[data-testid="container-card"][data-name="Packing Cube"]'),
	).not.toContainText('Hoodie');
});

test('containers — pack a 2nd item into a container that already has one', async ({
	page,
}) => {
	await gotoBoard(page, '/containers');
	const cube = page.locator(
		'[data-testid="container-card"][data-name="Packing Cube"]',
	);
	await expect(cube).toBeVisible();
	await expect(page.getByTestId('pool')).toContainText('Hoodie');

	// First item in.
	await dndDrag(page, page.getByText('Black Uniqlo Hoodie').first(), cube);
	await page.waitForTimeout(1200);
	await expect(cube).toContainText('Hoodie');

	// Second, DIFFERENT item into the now-non-empty container — the case that broke.
	await dndDrag(page, page.getByText('White Nike Socks').first(), cube);
	await page.waitForTimeout(1200);
	await page.reload();

	const cubeAfter = page.locator(
		'[data-testid="container-card"][data-name="Packing Cube"]',
	);
	await expect(cubeAfter).toContainText('Hoodie');
	await expect(cubeAfter).toContainText('Socks');
});

test('luggage — pack a container into a suitcase then pull it back out', async ({
	page,
}) => {
	await gotoBoard(page, '/luggage');
	const suitcase = page.locator(
		'[data-testid="suitcase-card"][data-name="Carry-on"]',
	);
	await expect(suitcase).toBeVisible();

	// Pool -> suitcase.
	await dndDrag(page, page.getByText('Packing Cube').first(), suitcase);
	await page.waitForTimeout(1200);
	await page.reload();
	await expect(
		page.locator('[data-testid="suitcase-card"][data-name="Carry-on"]'),
	).toContainText('Packing Cube');

	// Suitcase -> back out via the chip's Remove button (the per-item unpack
	// affordance; equivalent to dragging it to the pool, but deterministic).
	await page
		.locator('[data-testid="suitcase-card"][data-name="Carry-on"]')
		.getByRole('button', {
			name: 'Remove Packing Cube from suitcase',
			exact: true,
		})
		.click({ force: true });
	await page.waitForTimeout(800);
	await page.reload();

	await expect(
		page.locator('[data-testid="suitcase-card"][data-name="Carry-on"]'),
	).not.toContainText('Packing Cube');
	await expect(page.getByTestId('luggage-pool')).toContainText('Packing Cube');
});
