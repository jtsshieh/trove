import { execSync } from 'node:child_process';

import { expect, test } from '@playwright/test';

// Covers the TanStack Form migration: validation wiring (FormMessage), edit-dialog
// defaultValues prefill, required-enum Selects (null default → placeholder), and
// the controlled name/Select fields that the clothing scan prefill also drives.
// Each test starts from the clean seeded baseline so they are order-independent.
test.beforeEach(async ({ page }) => {
	execSync('npx tsx e2e/reset-and-seed.ts', { stdio: 'ignore' });
	await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('brand create — TanStack submit creates, closes, and resets the dialog', async ({
	page,
}) => {
	await page.goto('/closet/clothing/brands');
	await page.waitForLoadState('networkidle').catch(() => {});

	// The create trigger is the icon-only "+" button in the page header row — the
	// flex row that also holds the "Brands" <h1> (card footers reuse justify-between,
	// so scope to the header via :has(h1) to avoid matching a card's Edit button).
	await page.getByRole('heading', { name: 'Brands', exact: true }).waitFor();
	const openCreate = () =>
		page
			.locator('div.flex.justify-between:has(h1)')
			.getByRole('button')
			.last()
			.click();

	await openCreate();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();

	const name = 'QA Brand TanStack';
	await dialog.getByPlaceholder('Enter a name for this brand').fill(name);
	await dialog.getByRole('button', { name: 'Save changes' }).click();
	await expect(dialog).not.toBeVisible();
	await expect(page.getByText(name)).toBeVisible();

	await page.reload();
	await page.waitForLoadState('networkidle').catch(() => {});
	await expect(page.getByText(name)).toBeVisible();

	// Reopening the create dialog shows a reset (empty) input, not the last value.
	await openCreate();
	await expect(
		page.getByRole('dialog').getByPlaceholder('Enter a name for this brand'),
	).toHaveValue('');
});

test('clothing create — required Selects (null defaults) block submit with a validation message', async ({
	page,
}) => {
	await page.goto('/closet/clothing');
	await page.waitForLoadState('networkidle').catch(() => {});

	await page.getByRole('button', { name: 'Add Clothing' }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();

	// type/brand/color default to null (placeholder shown, no uncontrolled flip).
	// zod requires strings, so an immediate submit fails and FormMessage renders;
	// the dialog stays open.
	await dialog.getByRole('button', { name: 'Save changes' }).click();
	await expect(
		dialog.locator('[data-slot="form-message"]').first(),
	).toBeVisible();
	await expect(dialog).toBeVisible();
});

test('brand edit — dialog preloads the current name (defaultValues) and renames', async ({
	page,
}) => {
	await page.goto('/closet/clothing/brands');
	await page.waitForLoadState('networkidle').catch(() => {});

	const card = page.locator('[data-slot="card"]').filter({ hasText: 'Uniqlo' });
	await card.getByRole('button', { name: 'Edit' }).click();

	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	// Edit defaultValues must prefill the input.
	const input = dialog.getByPlaceholder('Enter a name for this brand');
	await expect(input).toHaveValue('Uniqlo');

	const renamed = 'Uniqlo Renamed';
	await input.fill(renamed);
	await dialog.getByRole('button', { name: 'Save changes' }).click();
	await expect(dialog).not.toBeVisible();

	await page.reload();
	await page.waitForLoadState('networkidle').catch(() => {});
	await expect(page.getByText(renamed, { exact: true })).toBeVisible();
});

test('clothing edit — Type/Brand/Color selects preload from the item (controlled prefill)', async ({
	page,
}) => {
	await page.goto('/closet/clothing');
	await page.waitForLoadState('networkidle').catch(() => {});

	const card = page
		.getByTestId('wardrobe-card')
		.filter({ hasText: 'Black Uniqlo Hoodie' });
	await expect(card).toBeVisible();
	await card.getByRole('button', { name: 'Edit' }).click();

	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();

	// The three Base UI Selects show their prefilled values (not the placeholder).
	// This is the same controlled-value path the scan setValue() prefill drives.
	await expect(dialog).toContainText('Hoodie');
	await expect(dialog).toContainText('Uniqlo');
	await expect(dialog).toContainText('Black');
	await expect(dialog.getByText('Select the type of clothing')).toHaveCount(0);

	// Change the color and persist.
	await dialog.getByText('Black', { exact: true }).first().click();
	await page.getByRole('option', { name: 'White', exact: true }).click();
	await dialog.getByRole('button', { name: 'Save changes' }).click();
	await expect(dialog).not.toBeVisible();

	await page.reload();
	await page.waitForLoadState('networkidle').catch(() => {});
	await expect(
		page
			.getByTestId('wardrobe-card')
			.filter({ hasText: 'White Uniqlo Hoodie' }),
	).toBeVisible();
});
