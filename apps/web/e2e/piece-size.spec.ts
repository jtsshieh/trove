import { execSync } from 'node:child_process';

import { expect, test, type Page } from '@playwright/test';

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

test('piece size — Large persists across reload, then restore Compact', async ({
	page,
}) => {
	await gotoBoard(page, '/clothing');

	const large = page.getByRole('tab', { name: 'Large pieces' });
	await large.click();
	await expect(large).toHaveAttribute('aria-selected', 'true');

	// In Large mode a day piece renders as an image-forward card (image on top,
	// name below) — the seeded hoodie is on day 0.
	await expect(
		page.getByTestId('piece').filter({ hasText: 'Black Uniqlo Hoodie' }),
	).toBeVisible();

	// Persisted via updateUserSettings; loaded server-side on reload.
	await page.reload();
	await page.waitForLoadState('networkidle').catch(() => {});
	await expect(page.getByRole('tab', { name: 'Large pieces' })).toHaveAttribute(
		'aria-selected',
		'true',
	);

	// Restore the seed default so other piece-size state stays clean.
	const compact = page.getByRole('tab', { name: 'Compact pieces' });
	await compact.click();
	await expect(compact).toHaveAttribute('aria-selected', 'true');
});

test('calendar — Universal + Backup lanes render below the weekly grid', async ({
	page,
}) => {
	await gotoBoard(page, '/clothing');
	await page.getByRole('tab', { name: 'Calendar' }).click();
	await expect(page.getByTestId('calendar-grid')).toBeVisible();

	const grid = page.getByTestId('calendar-grid');
	const universal = page.locator(
		'[data-testid="section-lane"][data-section="Universal"]',
	);
	const backup = page.locator(
		'[data-testid="section-lane"][data-section="Backup"]',
	);
	await expect(universal).toBeVisible();
	await expect(backup).toBeVisible();
	// The seeded socks live in Universal, which sits below the calendar grid.
	await expect(universal).toContainText('Socks');

	const gridBox = await grid.boundingBox();
	const uniBox = await universal.boundingBox();
	const backupBox = await backup.boundingBox();
	if (!gridBox || !uniBox || !backupBox) throw new Error('missing boxes');
	expect(uniBox.y).toBeGreaterThan(gridBox.y + gridBox.height - 1);
	expect(backupBox.y).toBeGreaterThan(gridBox.y + gridBox.height - 1);

	// Restore the seed default view so other tests start from List.
	await page.getByRole('tab', { name: 'List' }).click();
});
