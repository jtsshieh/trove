import { execSync } from 'node:child_process';

import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 1366, height: 2000 } });

test.beforeEach(async ({ page }) => {
	execSync('npx tsx e2e/reset-and-seed.ts', { stdio: 'ignore' });
	await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('electronics shows the seeded device + cable', async ({ page }) => {
	await page.goto('/electronics');
	await expect(
		page.getByRole('heading', { name: 'Electronics', exact: true }),
	).toBeVisible();
	await expect(page.getByTestId('electronic-card').first()).toBeVisible();
	await expect(page.getByText('iPad').first()).toBeVisible();
	await expect(page.getByText('Phone Charger').first()).toBeVisible();
});

test('electronics — add an item with a kind persists', async ({ page }) => {
	await page.goto('/electronics');
	await page.getByRole('button', { name: 'Add Electronic' }).first().click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();

	await dialog.getByText('Select the kind').click();
	await page.getByRole('option', { name: 'Power Bank', exact: true }).click();
	await dialog
		.getByPlaceholder('Enter a name for this item')
		.fill('Anker Battery');
	await dialog.getByRole('button', { name: 'Save changes' }).click();
	await expect(dialog).not.toBeVisible();

	await page.reload();
	await expect(
		page
			.getByTestId('electronic-card')
			.filter({ hasText: 'Anker Battery' })
			.first(),
	).toBeVisible();
});

test('electronics — link/unlink an accessory refreshes and persists', async ({
	page,
}) => {
	await page.goto('/electronics');
	// Seeded: iPad (device) ↔ Phone Charger (accessory).
	const ipad = page.locator(
		'[data-testid="electronic-card"][data-name="iPad"]',
	);
	await ipad.getByRole('button', { name: 'Edit' }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog.getByText('Associated items')).toBeVisible();

	// The seeded link renders as a removable chip.
	await expect(dialog.getByLabel('Unlink Phone Charger')).toBeVisible();

	// Unlink → chip disappears immediately (the mutation invalidates the live
	// query; before the fix the chip went stale).
	await dialog.getByLabel('Unlink Phone Charger').click();
	await expect(dialog.getByLabel('Unlink Phone Charger')).toHaveCount(0);

	// Re-link via the picker → chip comes back.
	await dialog.getByText('Pick an item to link').click();
	await page.getByRole('option', { name: 'Phone Charger', exact: true }).click();
	await dialog.getByRole('button', { name: 'Link', exact: true }).click();
	await expect(dialog.getByLabel('Unlink Phone Charger')).toBeVisible();

	// Persists across a reload (and the card shows the linked chip).
	await page.keyboard.press('Escape');
	await page.reload();
	await expect(ipad.getByText('Phone Charger')).toBeVisible();
});
