import { execSync } from 'node:child_process';

import { expect, test, type Page } from '@playwright/test';

import { dndDrag } from './helpers/dnd';

// The boards are tall; give them room so off-screen drop zones are reachable.
test.use({ viewport: { width: 1366, height: 2200 } });

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

function socksEntry(page: Page) {
	return page
		.getByTestId('closet-panel')
		.locator('[data-testid="closet-entry"][data-name="White Nike Socks"]');
}

test('closet — bringing defaults from the seed and "left" reflects placements', async ({
	page,
}) => {
	await gotoBoard(page, '/clothing');
	await page.getByRole('button', { name: 'Closet' }).click();
	await expect(page.getByTestId('closet-panel')).toBeVisible();

	// Socks: owns 12, seed brings 6, 1 placed in Universal → 5 left.
	const socks = socksEntry(page);
	await expect(socks.getByTestId('bring-value')).toHaveText('6');
	await expect(socks).toContainText('/ 12');
	await expect(socks.getByTestId('closet-left')).toHaveText('5 left');

	// A single-quantity piece is implicitly "bring 1": no allocation noise, so the
	// per-trip stepper and the "left" capacity badge are hidden entirely.
	const hoodie = page
		.getByTestId('closet-panel')
		.locator('[data-testid="closet-entry"][data-name="Black Uniqlo Hoodie"]');
	await expect(hoodie.getByTestId('bring-stepper')).toHaveCount(0);
	await expect(hoodie.getByTestId('closet-left')).toHaveCount(0);
});

test('closet — lowering the bringing stepper decrements "left" and persists', async ({
	page,
}) => {
	await gotoBoard(page, '/clothing');
	await page.getByRole('button', { name: 'Closet' }).click();
	const socks = socksEntry(page);
	await expect(socks.getByTestId('bring-value')).toHaveText('6');
	await expect(socks.getByTestId('closet-left')).toHaveText('5 left');

	// Drop bringing 6 → 3: 1 placed → 2 left.
	const fewer = socks.getByRole('button', {
		name: 'Bring one fewer White Nike Socks',
	});
	await fewer.click();
	await fewer.click();
	await fewer.click();
	await expect(socks.getByTestId('bring-value')).toHaveText('3');
	await expect(socks.getByTestId('closet-left')).toHaveText('2 left');

	// Persists across a reload (TripClothingBring row written). The write is
	// debounced + serialized client-side, so let it flush before reloading.
	await page.waitForTimeout(1200);
	await page.reload();
	await page.getByRole('button', { name: 'Closet' }).click();
	await expect(socksEntry(page).getByTestId('bring-value')).toHaveText('3');
	await expect(socksEntry(page).getByTestId('closet-left')).toHaveText(
		'2 left',
	);
});

test('reuse badge appears only once placements exceed bringing', async ({
	page,
}) => {
	await gotoBoard(page, '/clothing');
	const universal = page.locator(
		'[data-testid="section-lane"][data-section="Universal"]',
	);
	const socksPiece = universal.locator(
		'[data-testid="piece"][data-name="White Nike Socks"]',
	);
	await expect(socksPiece).toBeVisible();

	// Brought 6, placed once → not reused, so no badge.
	await expect(socksPiece.getByTestId('reuse-badge')).toHaveCount(0);

	// Drop bringing to 0 via the closet stepper → 1 placement now exceeds bringing.
	await page.getByRole('button', { name: 'Closet' }).click();
	const fewer = socksEntry(page).getByRole('button', {
		name: 'Bring one fewer White Nike Socks',
	});
	for (let i = 0; i < 6; i++) await fewer.click();
	await expect(socksEntry(page).getByTestId('bring-value')).toHaveText('0');

	// The badge now shows ×1 (one placement beyond what's being brought).
	await expect(socksPiece.getByTestId('reuse-badge')).toBeVisible();
	await expect(socksPiece.getByTestId('reuse-badge')).toHaveText('×1');
});

test('container pool shows one tile per distinct clothing (reuse dedupe)', async ({
	page,
}) => {
	// First, place the socks onto two days so it has 3 placements total
	// (Universal seed + 2 days). Use list view + closet drag (reliable full-width
	// day rows). Bring stays at the seeded 6 so all units are packable.
	await gotoBoard(page, '/clothing');
	await page.getByRole('tab', { name: 'List' }).click();
	await page.getByRole('button', { name: 'Closet' }).click();
	const closet = page.getByTestId('closet-panel');
	await expect(closet).toBeVisible();

	await dndDrag(
		page,
		closet.locator(
			'[data-testid="closet-piece"][data-name="White Nike Socks"]',
		),
		page.getByTestId('day-column').nth(2),
	);
	await page.waitForTimeout(1000);
	await dndDrag(
		page,
		closet.locator(
			'[data-testid="closet-piece"][data-name="White Nike Socks"]',
		),
		page.getByTestId('day-column').nth(3),
	);
	await page.waitForTimeout(1000);

	// Two day-columns now hold socks (plus the Universal seed) — 3 placements.
	await expect(page.getByTestId('day-column').nth(2)).toContainText('Socks');
	await expect(page.getByTestId('day-column').nth(3)).toContainText('Socks');

	// On the containers board, the Unassigned pool collapses those 3 placements
	// into ONE tile for the socks (a single packable owned unit, count badge).
	await gotoBoard(page, '/containers');
	const pool = page.getByTestId('pool');
	const socksTiles = pool.locator(
		'[data-testid="pool-tile"][data-name="White Nike Socks"]',
	);
	await expect(socksTiles).toHaveCount(1);
	await expect(socksTiles.getByTestId('pool-count')).toBeVisible();
});

test('clothing — duplicated pieces on one day collapse into one ×N stack', async ({
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

	// Drop the same physical socks onto one day TWICE — duplicates of one clothingId
	// collapse into a SINGLE tile with a ×2 stack badge (one drag moves one unit).
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
	await expect(socksOnDay).toHaveCount(1);
	await expect(socksOnDay.getByTestId('stack-badge')).toHaveText('×2');

	await page.waitForTimeout(1200);
	await page.reload();

	// Both provisions survive the round-trip — one tile, still ×2 (none lost/doubled).
	const reloaded = page
		.getByTestId('day-column')
		.nth(1)
		.locator('[data-testid="piece"][data-name="White Nike Socks"]');
	await expect(reloaded).toHaveCount(1);
	await expect(reloaded.getByTestId('stack-badge')).toHaveText('×2');
});
