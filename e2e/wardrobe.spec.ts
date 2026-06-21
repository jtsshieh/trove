import { execSync } from 'node:child_process';

import { expect, test, type Page } from '@playwright/test';

import { dndDrag } from './helpers/dnd';

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

test('closet shows the per-trip bringing count + units left on the socks', async ({
	page,
}) => {
	await gotoBoard(page, '/clothing');
	await page.getByRole('button', { name: 'Closet' }).click();

	const panel = page.getByTestId('closet-panel');
	await expect(panel).toBeVisible();
	await expect(panel).toContainText('White Nike Socks');

	// Seed brings 6 of the 12 owned socks; 1 is placed in Universal → 5 left.
	const entry = panel.locator(
		'[data-testid="closet-entry"][data-name="White Nike Socks"]',
	);
	await expect(entry.getByTestId('bring-value')).toHaveText('6');
	await expect(entry).toContainText('/ 12');
	await expect(entry.getByTestId('closet-left')).toHaveText('5 left');
});

test('wardrobe — create dialog shows the large photo + all fields + scan', async ({
	page,
}) => {
	await page.goto('/dashboard/wardrobe');
	await page.waitForLoadState('networkidle').catch(() => {});

	await page.getByRole('button', { name: 'Add Clothing' }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();

	// The redesigned dialog keeps every field, the empty-photo state, the photo
	// controls, the create-only scan button, and the quantity testid.
	await expect(dialog.getByText('No photo yet')).toBeVisible();
	await expect(dialog.getByRole('button', { name: 'Add photo' })).toBeVisible();
	// Crop / erase / remove-background all live in the image editor, opened via Edit.
	await expect(dialog.getByRole('button', { name: 'Edit' })).toBeVisible();
	await expect(
		dialog.getByRole('button', { name: 'Scan a photo' }),
	).toBeVisible();
	await expect(dialog.getByText('Select the type of clothing')).toBeVisible();
	await expect(dialog.getByText('Select the brand of clothing')).toBeVisible();
	await expect(dialog.getByText('Select the color of clothing')).toBeVisible();
	await expect(dialog.getByText('Brand Line')).toBeVisible();
	await expect(dialog.getByText('Modifier')).toBeVisible();
	await expect(dialog.getByTestId('quantity-input')).toBeVisible();
	await expect(
		dialog.getByRole('button', { name: 'Save changes' }),
	).toBeVisible();
});

test('wardrobe — edit dialog has no scan button and prefills the item', async ({
	page,
}) => {
	await page.goto('/dashboard/wardrobe');
	await page.waitForLoadState('networkidle').catch(() => {});

	const hoodie = page
		.getByTestId('wardrobe-card')
		.filter({ hasText: 'Black Uniqlo Hoodie' });
	await hoodie.getByRole('button', { name: 'Edit' }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();

	// Edit mode omits the create-only scan button but keeps the photo controls.
	await expect(dialog.getByRole('button', { name: 'Add photo' })).toBeVisible();
	await expect(
		dialog.getByRole('button', { name: 'Scan a photo' }),
	).toHaveCount(0);
	// The seeded hoodie's type/brand/color prefill the Selects.
	await expect(dialog.getByText('Hoodie', { exact: true })).toBeVisible();
	await expect(dialog.getByText('Uniqlo', { exact: true })).toBeVisible();
	await expect(dialog.getByText('Black', { exact: true })).toBeVisible();
});

test('wardrobe — create a clothing item with quantity 4 shows a ×4 stack badge', async ({
	page,
}) => {
	await page.goto('/dashboard/wardrobe');
	await page.waitForLoadState('networkidle').catch(() => {});

	await page.getByRole('button', { name: 'Add Clothing' }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();

	// Base UI Selects: click the trigger by its visible placeholder text, then the
	// option (options render in a portal, so query at the page level).
	await dialog.getByText('Select the type of clothing').click();
	await page.getByRole('option', { name: 'Beanie', exact: true }).click();

	await dialog.getByText('Select the brand of clothing').click();
	await page.getByRole('option', { name: 'Uniqlo', exact: true }).click();

	await dialog.getByText('Select the color of clothing').click();
	await page.getByRole('option', { name: 'Black', exact: true }).click();

	const quantity = page.getByTestId('quantity-input');
	await quantity.fill('4');

	await dialog.getByRole('button', { name: 'Save changes' }).click();
	await expect(dialog).not.toBeVisible();

	const card = page
		.getByTestId('wardrobe-card')
		.filter({ hasText: 'Black Uniqlo Beanie' });
	await expect(card).toBeVisible();
	await expect(card.getByTestId('quantity-badge')).toHaveText('×4');
});

test('wardrobe — single-quantity items render no quantity badge', async ({
	page,
}) => {
	await page.goto('/dashboard/wardrobe');
	await page.waitForLoadState('networkidle').catch(() => {});

	const hoodie = page
		.getByTestId('wardrobe-card')
		.filter({ hasText: 'Black Uniqlo Hoodie' });
	await expect(hoodie).toBeVisible();
	await expect(hoodie.getByTestId('quantity-badge')).toHaveCount(0);
});

test('wardrobe — drag-to-reorder within a type group persists', async ({
	page,
}) => {
	await page.goto('/dashboard/wardrobe');
	await page.waitForLoadState('networkidle').catch(() => {});

	// Seed has one Hoodie; add a second so the Hoodie group has two cards to order.
	await page.getByRole('button', { name: 'Add Clothing' }).click();
	const dialog = page.getByRole('dialog');
	await dialog.getByText('Select the type of clothing').click();
	await page.getByRole('option', { name: 'Hoodie', exact: true }).click();
	await dialog.getByText('Select the brand of clothing').click();
	await page.getByRole('option', { name: 'Nike', exact: true }).click();
	await dialog.getByText('Select the color of clothing').click();
	await page.getByRole('option', { name: 'Grey', exact: true }).click();
	await dialog.getByRole('button', { name: 'Save changes' }).click();
	await expect(dialog).not.toBeVisible();

	// Both hoodies share the only Hoodie group; the new one appends after the
	// seeded Black Uniqlo Hoodie (DOM order = lexorank order).
	const hoodies = page
		.getByTestId('wardrobe-card')
		.filter({ hasText: 'Hoodie' });
	await expect(hoodies).toHaveCount(2);
	await expect(hoodies.nth(0)).toContainText('Black Uniqlo Hoodie');
	await expect(hoodies.nth(1)).toContainText('Grey Nike Hoodie');

	// Drag Black onto Grey's slot to reorder it after Grey. The board is controlled
	// (onDragOver keeps React state in lockstep with dnd-kit), so a real pointer drag
	// exercises the full path: collision → move() → lexorank → PATCH → re-render.
	await dndDrag(
		page,
		hoodies.filter({ hasText: 'Black Uniqlo Hoodie' }),
		hoodies.filter({ hasText: 'Grey Nike Hoodie' }),
	);
	await page.waitForTimeout(1200);
	await page.reload();
	await page.waitForLoadState('networkidle').catch(() => {});

	// Persisted: Black moved after Grey.
	const after = page.getByTestId('wardrobe-card').filter({ hasText: 'Hoodie' });
	await expect(after.nth(0)).toContainText('Grey Nike Hoodie');
	await expect(after.nth(1)).toContainText('Black Uniqlo Hoodie');
});
