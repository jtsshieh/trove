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

test('display — Text only persists across reload', async ({ page }) => {
	await gotoBoard(page, '/clothing');

	const textOnly = page.getByRole('tab', { name: 'Text only' });
	await textOnly.click();
	await expect(textOnly).toHaveAttribute('aria-selected', 'true');

	// Persisted via updateUserSettings; settings are loaded server-side on reload.
	await page.reload();
	await page.waitForLoadState('networkidle').catch(() => {});

	await expect(page.getByRole('tab', { name: 'Text only' })).toHaveAttribute(
		'aria-selected',
		'true',
	);
});

test('display — Pictures only persists, then restore Both', async ({ page }) => {
	await gotoBoard(page, '/clothing');

	const picturesOnly = page.getByRole('tab', { name: 'Pictures only' });
	await picturesOnly.click();
	await expect(picturesOnly).toHaveAttribute('aria-selected', 'true');

	await page.reload();
	await page.waitForLoadState('networkidle').catch(() => {});

	await expect(
		page.getByRole('tab', { name: 'Pictures only' }),
	).toHaveAttribute('aria-selected', 'true');

	// Restore the seed default so other display state stays clean.
	const both = page.getByRole('tab', { name: 'Text and pictures' });
	await both.click();
	await expect(both).toHaveAttribute('aria-selected', 'true');
});
