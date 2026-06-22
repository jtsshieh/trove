import { execSync } from 'node:child_process';

import { expect, test, type Page } from '@playwright/test';

import { dndDrag } from './helpers/dnd';

// The clothing board is tall; give it room so off-screen drop zones are reachable.
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

test('closet — open, hide, then re-open via the Closet toggle', async ({
	page,
}) => {
	await gotoBoard(page, '/clothing');
	// The docked closet is closed by default (board gets full width); open it.
	await expect(page.getByTestId('closet-panel')).toBeHidden();
	await page.getByRole('button', { name: 'Closet' }).click();
	await expect(page.getByTestId('closet-panel')).toBeVisible();

	await page.getByRole('button', { name: 'Hide closet' }).click();
	await expect(page.getByTestId('closet-panel')).toBeHidden();

	await page.getByRole('button', { name: 'Closet' }).click();
	await expect(page.getByTestId('closet-panel')).toBeVisible();
});

test('closet — drag a piece from the closet onto a day', async ({ page }) => {
	await gotoBoard(page, '/clothing');
	// List view gives full-width day rows — a reliable drop target (the calendar's
	// 7 narrow columns are too small for a precise pointer drop, especially with
	// the closet docked open).
	await page.getByRole('tab', { name: 'List' }).click();
	await page.getByRole('button', { name: 'Closet' }).click();
	const closet = page.getByTestId('closet-panel');
	await expect(closet).toBeVisible();

	await dndDrag(
		page,
		closet.locator(
			'[data-testid="closet-piece"][data-name="Beige Uniqlo Chinos"]',
		),
		page.getByTestId('day-column').nth(1),
	);
	await page.waitForTimeout(1200);
	await page.reload();

	await expect(page.getByTestId('day-column').nth(1)).toContainText('Chinos');
});

test('closet — search filters the draggable catalog', async ({ page }) => {
	await gotoBoard(page, '/clothing');
	await page.getByRole('button', { name: 'Closet' }).click();
	const closet = page.getByTestId('closet-panel');
	await expect(closet).toBeVisible();

	// The seeded wardrobe has 6 distinct pieces.
	await expect(closet.locator('[data-testid="closet-piece"]')).toHaveCount(6);

	await closet.getByPlaceholder('Search your wardrobe…').fill('Levi');
	await expect(closet.locator('[data-testid="closet-piece"]')).toHaveCount(1);
	await expect(
		closet.locator(
			'[data-testid="closet-piece"][data-name="Blue Levi\'s Jeans"]',
		),
	).toBeVisible();
});

test('closet — switching to the Outfits tab shows outfit templates', async ({
	page,
}) => {
	await gotoBoard(page, '/clothing');
	await page.getByRole('button', { name: 'Closet' }).click();
	const closet = page.getByTestId('closet-panel');
	await expect(closet).toBeVisible();

	// Clothes is the default tab: the catalog is shown, outfits are not.
	await expect(closet.locator('[data-testid="closet-piece"]')).toHaveCount(6);
	await expect(closet.locator('[data-testid="closet-outfit"]')).toHaveCount(0);

	await closet.getByRole('tab', { name: 'Outfits' }).click();

	// The seeded "Casual Day" template surfaces as a draggable outfit chip.
	await expect(closet.locator('[data-testid="closet-outfit"]')).toHaveCount(1);
	await expect(
		closet.locator('[data-testid="closet-outfit"][data-name="Casual Day"]'),
	).toBeVisible();
	await expect(closet.locator('[data-testid="closet-piece"]')).toHaveCount(0);

	// And back: the catalog returns.
	await closet.getByRole('tab', { name: 'Clothes' }).click();
	await expect(closet.locator('[data-testid="closet-piece"]')).toHaveCount(6);
});
