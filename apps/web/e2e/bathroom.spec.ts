import { execSync } from 'node:child_process';

import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 1366, height: 2000 } });

test.beforeEach(async ({ page }) => {
	execSync('npx tsx e2e/reset-and-seed.ts', { stdio: 'ignore' });
	await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('bathroom catalog shows the seeded consumable/appliance/launderable', async ({
	page,
}) => {
	await page.goto('/bathroom/catalog');
	await expect(
		page.getByRole('heading', { name: 'Catalog', exact: true }),
	).toBeVisible();
	await expect(page.getByTestId('bathroom-product-card').first()).toBeVisible();
	await expect(page.getByText('Shampoo').first()).toBeVisible();
	await expect(page.getByText('Toothbrush').first()).toBeVisible();
	await expect(page.getByText('Bath Towel').first()).toBeVisible();
});

test('bathroom — add a product persists', async ({ page }) => {
	await page.goto('/bathroom/catalog');
	await page.getByRole('button', { name: 'Add product' }).first().click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	await dialog.getByPlaceholder('e.g. Daily shampoo').fill('Body Wash');
	// Pick a nature (required — base-ui Select trigger shows its placeholder text).
	await dialog.getByText('Consumable, appliance, or launderable').click();
	await page.getByRole('option', { name: 'Consumable', exact: true }).click();
	// The default variant row is enough (label/capacity are optional); name it.
	await dialog.getByPlaceholder('e.g. Travel size').first().fill('500 mL');
	await dialog.getByRole('button', { name: 'Save changes' }).click();
	await expect(dialog).not.toBeVisible();

	await page.reload();
	await expect(
		page
			.getByTestId('bathroom-product-card')
			.filter({ hasText: 'Body Wash' })
			.first(),
	).toBeVisible();
});

test('bathroom launderables — the seeded dirty towel can be marked washed', async ({
	page,
}) => {
	await page.goto('/bathroom/launderables');

	const markWashed = page.getByRole('button', { name: 'Mark washed' });
	await expect(markWashed.first()).toBeVisible(); // the seeded Dirty Bath Towel unit
	await markWashed.first().click();
	await page.waitForTimeout(700);

	// Once washed, the unit returns to stock and the action disappears.
	await expect(page.getByRole('button', { name: 'Mark washed' })).toHaveCount(0);
});
