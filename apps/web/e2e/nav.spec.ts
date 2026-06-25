import { execSync } from 'node:child_process';

import { expect, test, type Page } from '@playwright/test';

// Each test starts from the clean seeded baseline so they are order-independent.
// The reset keeps the user row, so the logged-in session stays valid.
test.beforeEach(async ({ page }) => {
	execSync('npx tsx e2e/reset-and-seed.ts', { stdio: 'ignore' });
	await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function gotoBoard(page: Page, path: string): Promise<void> {
	await page.goto('/trips');
	const href = await page
		.locator('a:has-text("Open")')
		.first()
		.getAttribute('href');
	if (!href) throw new Error('no seeded trip');
	await page.goto(`${href}${path}`);
	await page.waitForLoadState('networkidle').catch(() => {});
}

test('sidebar — collapse hides the trip heading', async ({ page }) => {
	await gotoBoard(page, '/clothing');
	await expect(
		page.getByRole('heading', { name: 'Test Trip' }),
	).toBeVisible();

	await page.getByRole('button', { name: 'Collapse sidebar' }).click();

	await expect(
		page.getByRole('heading', { name: 'Test Trip' }),
	).toBeHidden();
	await expect(
		page.getByRole('button', { name: 'Expand sidebar' }),
	).toBeVisible();
});

test('sidebar — collapsed state persists across reload', async ({ page }) => {
	await gotoBoard(page, '/clothing');
	await page.getByRole('button', { name: 'Collapse sidebar' }).click();
	await expect(
		page.getByRole('button', { name: 'Expand sidebar' }),
	).toBeVisible();

	await page.reload();
	await page.waitForLoadState('networkidle').catch(() => {});

	await expect(
		page.getByRole('button', { name: 'Expand sidebar' }),
	).toBeVisible();

	await page.getByRole('button', { name: 'Expand sidebar' }).click();
	await expect(
		page.getByRole('heading', { name: 'Test Trip' }),
	).toBeVisible();
});

test('sidebar — collapsed nav still navigates', async ({ page }) => {
	await gotoBoard(page, '/clothing');
	await page.getByRole('button', { name: 'Collapse sidebar' }).click();
	await expect(
		page.getByRole('button', { name: 'Expand sidebar' }),
	).toBeVisible();

	// The sidebar nav items are Base UI Buttons rendering a Link — role "button".
	await page.locator('nav').getByRole('button', { name: 'Containers' }).click();
	await page.waitForLoadState('networkidle').catch(() => {});

	await expect(page).toHaveURL(/\/containers/);
});
