import { execSync } from 'node:child_process';

import { expect, test } from '@playwright/test';

// The nature tabs are the heart of the bathroom redesign: Catalog only defines
// products + variants; Consumables/Appliances/Launderables own the stock lifecycle.
// Seeded data (see prisma/seed.ts):
//   Shampoo (Consumable, Liquid) — "250 mL" variant w/ 3 InStock units, "100 mL Travel" w/ 0
//   Toothbrush (Appliance) — "Standard" variant, 0 units owned
//   Bath Towel (Launderable) — "Bath" variant, 1 Dirty unit

test.use({ viewport: { width: 1366, height: 2000 } });

test.beforeEach(async ({ page }) => {
	execSync('npx tsx e2e/reset-and-seed.ts', { stdio: 'ignore' });
	await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('consumables — on-hand stepper buys, uses, and flags out-of-stock', async ({
	page,
}) => {
	await page.goto('/bathroom/consumables');

	// The full-size Shampoo variant starts with 3 on hand ("how many I have").
	const full = page.getByRole('listitem').filter({ hasText: '250 mL' });
	await expect(full.getByLabel(/on hand/)).toHaveText('3');

	// Buy one → 4, use one → 3 (server round-trips; toHaveText retries until refetch).
	await full.getByRole('button', { name: 'Buy one 250 mL' }).click();
	await expect(full.getByLabel(/on hand/)).toHaveText('4');
	await full.getByRole('button', { name: 'Use one 250 mL' }).click();
	await expect(full.getByLabel(/on hand/)).toHaveText('3');

	// The empty travel variant is flagged out-of-stock and can't be used down further.
	const travel = page.getByRole('listitem').filter({ hasText: '100 mL Travel' });
	await expect(travel.getByText('Out of stock')).toBeVisible();
	await expect(
		travel.getByRole('button', { name: 'Use one 100 mL Travel' }),
	).toBeDisabled();

	// Buy a batch of 5 of the travel size → on-hand jumps to 5.
	await travel.getByRole('button', { name: 'Buy batch' }).click();
	const dialog = page.getByRole('dialog');
	await dialog.locator('input[type="number"]').fill('5');
	await dialog.getByRole('button', { name: /Add 5 to stock/ }).click();
	await expect(dialog).not.toBeVisible();
	await expect(travel.getByLabel(/on hand/)).toHaveText('5');
});

test('appliances — buy a unit then check out, check in, and retire it', async ({
	page,
}) => {
	await page.goto('/bathroom/appliances');
	await expect(page.getByText('Toothbrush')).toBeVisible();

	// Toothbrush starts with nothing owned — buy one unit.
	await page.getByRole('button', { name: 'Buy', exact: true }).click();
	const checkOut = page.getByRole('button', { name: 'Check out' });
	await expect(checkOut).toBeVisible();

	// Check out → in use (offers check-in + retire), then check back in.
	await checkOut.click();
	await expect(page.getByRole('button', { name: 'Check in' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Retire' })).toBeVisible();
	await page.getByRole('button', { name: 'Check in' }).click();
	await expect(page.getByRole('button', { name: 'Check out' })).toBeVisible();

	// Check out again, then retire — the unit is gone and no actions remain.
	await page.getByRole('button', { name: 'Check out' }).click();
	await page.getByRole('button', { name: 'Retire' }).click();
	await expect(page.getByRole('button', { name: 'Check out' })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Check in' })).toHaveCount(0);
});

test('launderables — run the towel through the full clean/dirty cycle', async ({
	page,
}) => {
	await page.goto('/bathroom/launderables');

	// Seeded Bath Towel unit is Dirty → wash it → clean (offers Use).
	await page.getByRole('button', { name: 'Mark washed' }).click();
	const use = page.getByRole('button', { name: 'Use' });
	await expect(use).toBeVisible();

	// Use it (in use) → mark dirty → back to the wash queue.
	await use.click();
	await page.getByRole('button', { name: 'Mark dirty' }).click();
	await expect(page.getByRole('button', { name: 'Mark washed' })).toBeVisible();
});

test('appliances — Remove drops one on-hand unit', async ({ page }) => {
	await page.goto('/bathroom/appliances');
	// Toothbrush starts with nothing owned, so Remove is disabled.
	const remove = page.getByRole('button', { name: 'Remove one' });
	await expect(remove).toBeDisabled();

	// Buy one → Remove enables; click it → back to none owned (Remove disabled).
	await page.getByRole('button', { name: 'Buy', exact: true }).click();
	await expect(remove).toBeEnabled();
	await remove.click();
	await expect(remove).toBeDisabled();
});

test('catalog is add-only and the dialog adapts to the chosen nature', async ({
	page,
}) => {
	await page.goto('/bathroom/catalog');

	// The Catalog tab defines products — it must NOT show stock steppers/actions.
	await expect(page.getByTestId('bathroom-product-card').first()).toBeVisible();
	await expect(page.getByRole('button', { name: /Use one/ })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Check out' })).toHaveCount(0);

	await page.getByRole('button', { name: 'Add product' }).first().click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();

	// Consumable: both the liquid Form field and the per-variant Volume input appear.
	// ("Size" exact = the volume input; "e.g. Travel size" is the label input.)
	await dialog.getByText('Consumable, appliance, or launderable').click();
	await page.getByRole('option', { name: 'Consumable', exact: true }).click();
	await expect(dialog.getByText('Form')).toBeVisible();
	await expect(
		dialog.getByPlaceholder('Size', { exact: true }).first(),
	).toBeVisible();

	// Switch the nature select to Appliance → Form + Volume both disappear.
	await dialog.getByRole('combobox').first().click();
	await page.getByRole('option', { name: 'Appliance', exact: true }).click();
	await expect(dialog.getByLabel('Form')).toHaveCount(0);
	await expect(dialog.getByPlaceholder('Size', { exact: true })).toHaveCount(0);
});
