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

const cubeCards = (page: Page) =>
	page.locator('[data-testid="container-card"][data-name="Packing Cube"]');

test('add several of a multi-owned container — each appears as its own card', async ({
	page,
}) => {
	await gotoBoard(page, '/containers');
	// Packing Cube is owned ×3, one already on the trip → 2 still addable.
	await expect(cubeCards(page)).toHaveCount(1);

	await page.getByRole('button', { name: 'Add container' }).click();
	const dialog = page.getByRole('dialog');
	await dialog.getByRole('option', { name: 'Packing Cube' }).click();
	// The quantity stepper appears for the multi-owned container; bump to 2.
	await dialog
		.getByRole('button', { name: 'Add one more Packing Cube' })
		.click();
	await dialog.getByRole('button', { name: /^Add 2$/ }).click();

	await expect(cubeCards(page)).toHaveCount(3);
	await page.reload();
	await expect(cubeCards(page)).toHaveCount(3);
});

test('reorder container cards within the trip (persists)', async ({ page }) => {
	await gotoBoard(page, '/containers');
	// Add a 2nd, differently-named container so order is unambiguous.
	await page.getByRole('button', { name: 'Add container' }).click();
	const dialog = page.getByRole('dialog');
	await dialog.getByRole('option', { name: 'Toiletry Pouch' }).click();
	await dialog.getByRole('button', { name: /^Add/ }).click();
	await page.waitForTimeout(800);
	await page.reload();

	const cards = page.locator('[data-testid="container-card"]');
	const order = () =>
		cards.evaluateAll((els) => els.map((e) => e.getAttribute('data-name')));
	await expect(cards).toHaveCount(2);
	let names = await order();
	// Seeded order: Packing Cube before Toiletry Pouch.
	expect(names.indexOf('Packing Cube')).toBeLessThan(
		names.indexOf('Toiletry Pouch'),
	);

	// Drag the Toiletry Pouch card (by its grip) onto the Packing Cube card.
	await dndDrag(
		page,
		page
			.locator('[data-testid="container-card"][data-name="Toiletry Pouch"]')
			.getByTestId('container-grip'),
		page.locator('[data-testid="container-card"][data-name="Packing Cube"]'),
	);
	await page.waitForTimeout(1200);
	await page.reload();
	await expect(cards).toHaveCount(2);

	names = await order();
	expect(names.indexOf('Toiletry Pouch')).toBeLessThan(
		names.indexOf('Packing Cube'),
	);
});

test('identical items stack inside a container (×N), like the pool', async ({
	page,
}) => {
	// Give the socks 3 placements (Universal seed + two days) so the pool has spare
	// units to pack into a container more than once.
	await gotoBoard(page, '/clothing');
	await page.getByRole('tab', { name: 'List' }).click();
	await page.getByRole('button', { name: 'Closet' }).click();
	const closet = page.getByTestId('closet-panel');
	const sock = closet.locator(
		'[data-testid="closet-piece"][data-name="White Nike Socks"]',
	);
	await dndDrag(page, sock, page.getByTestId('day-column').nth(2));
	await page.waitForTimeout(900);
	await dndDrag(page, sock, page.getByTestId('day-column').nth(3));
	await page.waitForTimeout(900);

	await gotoBoard(page, '/containers');
	const cube = page.locator(
		'[data-testid="container-card"][data-name="Packing Cube"]',
	);
	const poolSocks = page
		.getByTestId('pool')
		.locator('[data-testid="pool-tile"][data-name="White Nike Socks"]');
	await expect(poolSocks).toHaveCount(1);

	// Pack one sock unit, then another, into the cube → one tile with a ×2 badge.
	await dndDrag(page, poolSocks, cube);
	await page.waitForTimeout(1000);
	await dndDrag(
		page,
		page
			.getByTestId('pool')
			.locator('[data-testid="pool-tile"][data-name="White Nike Socks"]'),
		cube,
	);
	await page.waitForTimeout(1200);
	await page.reload();

	const cube2 = page.locator(
		'[data-testid="container-card"][data-name="Packing Cube"]',
	);
	const packed = cube2.locator(
		'[data-testid="provision-tile"][data-name="White Nike Socks"]',
	);
	await expect(packed).toHaveCount(1);
	await expect(packed.getByTestId('stack-count')).toHaveText('×2');
});
