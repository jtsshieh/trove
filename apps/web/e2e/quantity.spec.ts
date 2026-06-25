import { execSync } from 'node:child_process';

import { expect, test, type Page } from '@playwright/test';

// The boards are tall; give them room so off-screen drop zones are reachable.
test.use({ viewport: { width: 1366, height: 2200 } });

test.beforeEach(async ({ page }) => {
	execSync('npx tsx e2e/reset-and-seed.ts', { stdio: 'ignore' });
	await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function gotoClothing(page: Page): Promise<void> {
	await page.goto('/trips');
	const href = await page
		.locator('a:has-text("Open")')
		.first()
		.getAttribute('href');
	if (!href) throw new Error('no seeded trip');
	await page.goto(`${href}/clothing`);
	await page.waitForLoadState('networkidle').catch(() => {});
	await page.getByRole('tab', { name: 'List' }).click();
}

function entry(page: Page, name: string) {
	return page
		.getByTestId('closet-panel')
		.locator(`[data-testid="closet-entry"][data-name="${name}"]`);
}

test('add to every day fills EVERY day including the last', async ({ page }) => {
	await gotoClothing(page);
	await page.getByRole('button', { name: 'Closet' }).click();
	await expect(page.getByTestId('closet-panel')).toBeVisible();

	// Hoodie is seeded only on day 0. "Add to every day" must cover all 7 days.
	await entry(page, 'Black Uniqlo Hoodie')
		.getByRole('button', { name: 'Add Black Uniqlo Hoodie to every day' })
		.click();

	await page.waitForTimeout(1200);
	await page.reload();

	const days = page.getByTestId('day-column');
	await expect(days).toHaveCount(7);
	// The bug skipped the trailing day(s); assert the LAST day got it.
	await expect(days.nth(6)).toContainText('Hoodie');
	await expect(days.nth(3)).toContainText('Hoodie');
});

test('closet "used" reflects every placement (day-reuse no longer hides count)', async ({
	page,
}) => {
	await gotoClothing(page);
	await page.getByRole('button', { name: 'Closet' }).click();

	// Socks: owns 12, bringing 6, one Universal placement → 5 left.
	const socks = entry(page, 'White Nike Socks');
	await expect(socks.getByTestId('closet-left')).toHaveText('5 left');

	// Spread across all 7 days → 1 Universal + 7 day placements = 8 placements.
	// With placement-based counting that exceeds the bring of 6, so the badge reads
	// "used" (the old day-reuse math would have wrongly shown "4 left").
	await socks
		.getByRole('button', { name: 'Add White Nike Socks to every day' })
		.click();
	await page.waitForTimeout(1200);
	await page.reload();
	await page.getByRole('button', { name: 'Closet' }).click();

	await expect(page.getByTestId('day-column').nth(6)).toContainText('Socks');
	await expect(entry(page, 'White Nike Socks').getByTestId('closet-left')).toHaveText(
		'used',
	);
});
