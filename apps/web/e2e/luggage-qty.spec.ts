import { execSync } from 'node:child_process';

import { expect, test, type Page } from '@playwright/test';

import { dndDrag } from './helpers/dnd';

test.use({ viewport: { width: 1366, height: 2200 } });

test.beforeEach(async ({ page }) => {
	execSync('npx tsx e2e/reset-and-seed.ts', { stdio: 'ignore' });
	await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function gotoLuggage(page: Page): Promise<void> {
	await page.goto('/trips');
	const href = await page
		.locator('a:has-text("Open")')
		.first()
		.getAttribute('href');
	if (!href) throw new Error('no seeded trip');
	await page.goto(`${href}/luggage`);
	await page.waitForLoadState('networkidle').catch(() => {});
}

const carryOnCards = (page: Page) =>
	page.locator('[data-testid="suitcase-card"][data-name="Carry-on"]');

test('add several of a multi-owned suitcase — each appears as its own card', async ({
	page,
}) => {
	await gotoLuggage(page);
	// Carry-on is owned ×3, one already on the trip → 2 still addable.
	await expect(carryOnCards(page)).toHaveCount(1);

	await page.getByRole('button', { name: 'Add suitcase' }).click();
	const dialog = page.getByRole('dialog');
	await dialog.getByRole('combobox').click();
	await page.getByRole('option', { name: 'Carry-on' }).click();
	// The quantity stepper shows for the multi-owned suitcase; bump to 2.
	await dialog.getByRole('button', { name: 'Add one more' }).click();
	await dialog.getByRole('button', { name: 'Add 2 suitcases' }).click();

	await expect(carryOnCards(page)).toHaveCount(3);
	await page.reload();
	await expect(carryOnCards(page)).toHaveCount(3);
});

test('reorder suitcase cards within the trip (persists)', async ({ page }) => {
	await gotoLuggage(page);
	// Add a 2nd, differently-named suitcase so order is unambiguous.
	await page.getByRole('button', { name: 'Add suitcase' }).click();
	const dialog = page.getByRole('dialog');
	await dialog.getByRole('combobox').click();
	await page.getByRole('option', { name: 'Weekender Duffel' }).click();
	await dialog.getByRole('button', { name: /^Add suitcase$/ }).click();
	await page.waitForTimeout(800);
	await page.reload();

	const cards = page.locator('[data-testid="suitcase-card"]');
	const order = () =>
		cards.evaluateAll((els) => els.map((e) => e.getAttribute('data-name')));
	await expect(cards).toHaveCount(2);
	let names = await order();
	// Seeded order: Carry-on before Weekender Duffel.
	expect(names.indexOf('Carry-on')).toBeLessThan(
		names.indexOf('Weekender Duffel'),
	);

	// Drag the Weekender card (by its grip) onto the Carry-on card.
	await dndDrag(
		page,
		page
			.locator('[data-testid="suitcase-card"][data-name="Weekender Duffel"]')
			.getByTestId('suitcase-grip'),
		page.locator('[data-testid="suitcase-card"][data-name="Carry-on"]'),
	);
	await page.waitForTimeout(1200);
	await page.reload();
	await expect(cards).toHaveCount(2);

	names = await order();
	expect(names.indexOf('Weekender Duffel')).toBeLessThan(
		names.indexOf('Carry-on'),
	);
});
