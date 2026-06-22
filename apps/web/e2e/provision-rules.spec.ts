import { execSync } from 'node:child_process';

import { expect, test, type Page } from '@playwright/test';

import { dndDrag } from './helpers/dnd';

// The boards are tall; give them room so off-screen drop zones are reachable.
test.use({ viewport: { width: 1366, height: 2200 } });

// Each test starts from the clean seeded baseline so they are order-independent.
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

test('day stacking — same clothing twice on one day renders one ×2 tile', async ({
	page,
}) => {
	await gotoBoard(page, '/clothing');
	await page.getByRole('tab', { name: 'List' }).click();
	await page.getByRole('button', { name: 'Closet' }).click();
	const closet = page.getByTestId('closet-panel');
	await expect(closet).toBeVisible();

	const day = page.getByTestId('day-column').nth(1);
	const socksOnDay = day.locator(
		'[data-testid="piece"][data-name="White Nike Socks"]',
	);

	// Drop the same physical socks onto one day TWICE.
	await dndDrag(
		page,
		closet.locator(
			'[data-testid="closet-piece"][data-name="White Nike Socks"]',
		),
		day,
	);
	await expect(socksOnDay).toHaveCount(1);
	await dndDrag(
		page,
		closet.locator(
			'[data-testid="closet-piece"][data-name="White Nike Socks"]',
		),
		socksOnDay.first(),
	);

	// Two provisions on one day collapse into a SINGLE tile with a ×2 stack badge.
	await expect(socksOnDay).toHaveCount(1);
	await expect(socksOnDay.getByTestId('stack-badge')).toHaveText('×2');

	// Survives a reload — still one tile, still ×2 (two provisions persisted).
	await page.waitForTimeout(1000);
	await page.reload();
	await page.getByRole('tab', { name: 'List' }).click();
	const reloaded = page
		.getByTestId('day-column')
		.nth(1)
		.locator('[data-testid="piece"][data-name="White Nike Socks"]');
	await expect(reloaded).toHaveCount(1);
	await expect(reloaded.getByTestId('stack-badge')).toHaveText('×2');
});

test('exclusivity — a single-quantity piece cannot be in both a day and backup', async ({
	page,
}) => {
	await gotoBoard(page, '/clothing');
	await page.getByRole('button', { name: 'Closet' }).click();
	const closet = page.getByTestId('closet-panel');
	await expect(closet).toBeVisible();

	// The seeded Black Uniqlo Hoodie (quantity 1) already lives on day 0. Dragging
	// it from the CLOSET into Backup would create a SECOND placement of a one-of
	// piece — disallowed (a single unit can be in just one spot).
	const backup = page.locator(
		'[data-testid="section-lane"][data-section="Backup"]',
	);
	await dndDrag(
		page,
		closet.locator(
			'[data-testid="closet-piece"][data-name="Black Uniqlo Hoodie"]',
		),
		backup,
	);

	// The board surfaces the rejection and Backup stays empty. (Day-reuse of a one-of
	// piece is fine — one unit shared — but a second SECTION needs a second unit.)
	await expect(page.getByText(/two places at once|only one of it/i)).toBeVisible();
	await expect(backup).not.toContainText('Hoodie');

	await page.waitForTimeout(1000);
	await page.reload();

	// The hoodie stayed on day 0 and never landed in Backup.
	await expect(page.getByTestId('day-column').nth(0)).toContainText('Hoodie');
	await expect(
		page.locator('[data-testid="section-lane"][data-section="Backup"]'),
	).not.toContainText('Hoodie');
});

test('closet — single-quantity pieces show no bring stepper or "left" badge', async ({
	page,
}) => {
	await gotoBoard(page, '/clothing');
	await page.getByRole('button', { name: 'Closet' }).click();
	const closet = page.getByTestId('closet-panel');
	await expect(closet).toBeVisible();

	// The Black Uniqlo Hoodie is quantity 1 — no allocation noise.
	const hoodie = closet.locator(
		'[data-testid="closet-entry"][data-name="Black Uniqlo Hoodie"]',
	);
	await expect(hoodie.getByTestId('bring-stepper')).toHaveCount(0);
	await expect(hoodie.getByTestId('closet-left')).toHaveCount(0);

	// White Nike Socks is quantity 12 — the stepper and "left" badge DO show.
	const socks = closet.locator(
		'[data-testid="closet-entry"][data-name="White Nike Socks"]',
	);
	await expect(socks.getByTestId('bring-stepper')).toBeVisible();
	await expect(socks.getByTestId('closet-left')).toBeVisible();
});
