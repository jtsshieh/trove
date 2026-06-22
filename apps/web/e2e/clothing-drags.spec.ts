import { execSync } from 'node:child_process';

import { expect, test, type Locator, type Page } from '@playwright/test';

import { dndDrag } from './helpers/dnd';

// Exhaustive drag coverage for the clothing board's zone graph: day↔day,
// Universal→day, day→Universal, Universal↔Backup, Backup→day, day→Backup.
//
// dnd-kit pointer drags are only reliable over short, on-screen distances, so we
// stay in the list view (full-width day rows) at a tall viewport where the last
// day column sits directly above the side-by-side Universal/Backup lanes. Every
// drag here is therefore adjacent (last-day ↔ lane) or side-by-side (lane ↔ lane);
// long top-to-bottom drags are intentionally avoided. Each persistence claim is
// re-asserted after a reload. Setup drags for the day→lane cases are themselves
// reliable adjacent moves and are asserted before the measured drag runs.
test.use({ viewport: { width: 1366, height: 2200 } });

// Each test starts from the clean seeded baseline so they are order-independent.
test.beforeEach(async ({ page }) => {
	execSync('npx tsx e2e/reset-and-seed.ts', { stdio: 'ignore' });
	await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function gotoListBoard(page: Page): Promise<void> {
	await page.goto('/trip-planner');
	const href = await page
		.locator('a:has-text("Open")')
		.first()
		.getAttribute('href');
	if (!href) throw new Error('no seeded trip');
	await page.goto(`${href}/clothing`);
	await page.waitForLoadState('networkidle').catch(() => {});
	// List view = full-width day rows stacked above the two lanes → short drags.
	await page.getByRole('tab', { name: 'List' }).click();
}

const universal = (page: Page): Locator =>
	page.locator('[data-testid="section-lane"][data-section="Universal"]');
const backup = (page: Page): Locator =>
	page.locator('[data-testid="section-lane"][data-section="Backup"]');
const day = (page: Page, n: number): Locator =>
	page.getByTestId('day-column').nth(n);

// The seeded socks live in Universal; index 6 is the trip's last day — the column
// that abuts the lanes, so a day↔lane drag is always a short hop.
const socksIn = (scope: Locator): Locator =>
	scope.locator('[data-testid="piece"][data-name="White Nike Socks"]');
const LAST_DAY = 6;

async function settle(page: Page): Promise<void> {
	await page.waitForTimeout(1200);
	await page.reload();
	await page.getByRole('tab', { name: 'List' }).waitFor();
}

const hoodieIn = (scope: Locator): Locator =>
	scope.locator('[data-testid="piece"][data-name="Black Uniqlo Hoodie"]');

test('clothing drag — day ↔ day (both directions persist)', async ({ page }) => {
	await gotoListBoard(page);
	await expect(day(page, 0)).toContainText('Hoodie');

	// earlier → later: day 0 → day 2 (empty). dnd-kit drops resolve cleanly onto an
	// empty zone, so we always aim at vacant days to keep the move deterministic.
	await dndDrag(page, hoodieIn(day(page, 0)), day(page, 2));
	await settle(page);
	await expect(day(page, 2)).toContainText('Hoodie');
	await expect(day(page, 0)).not.toContainText('Hoodie');

	// later → earlier: day 2 → day 1 (still empty) — the reverse direction.
	await dndDrag(page, hoodieIn(day(page, 2)), day(page, 1));
	await settle(page);
	await expect(day(page, 1)).toContainText('Hoodie');
	await expect(day(page, 2)).not.toContainText('Hoodie');
});

test('clothing drag — into a NON-EMPTY day (both pieces persist, no runtime errors)', async ({
	page,
}) => {
	// The cross-group move into a non-empty group must NOT throw the dnd-kit/React
	// reconciliation errors (useInsertionEffect / removeChild) the user reported.
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
	page.on('console', (m) => {
		const t = m.text();
		if (
			m.type() === 'error' &&
			(t.includes('useInsertionEffect') || t.includes('removeChild'))
		)
			errors.push(`CONSOLE: ${t}`);
	});

	await gotoListBoard(page);
	await expect(day(page, 0)).toContainText('Hoodie');

	// Drop the Universal socks onto day 0, which already holds the Hoodie — the
	// "drop into a group that already has items" case (cross-group live-sort).
	await dndDrag(page, socksIn(universal(page)), day(page, 0));
	await settle(page);

	await expect(day(page, 0)).toContainText('Hoodie');
	await expect(day(page, 0)).toContainText('Socks');
	await expect(universal(page)).not.toContainText('Socks');
	expect(errors, `\n${errors.join('\n')}\n`).toEqual([]);
});

test('clothing drag — Universal → day', async ({ page }) => {
	await gotoListBoard(page);
	await expect(universal(page)).toContainText('Socks');

	await dndDrag(page, socksIn(universal(page)), day(page, LAST_DAY));
	await settle(page);

	await expect(day(page, LAST_DAY)).toContainText('Socks');
	await expect(universal(page)).not.toContainText('Socks');
});

test('clothing drag — day → Universal', async ({ page }) => {
	await gotoListBoard(page);

	// Precondition: park the socks on the last day (reliable adjacent move).
	await dndDrag(page, socksIn(universal(page)), day(page, LAST_DAY));
	await settle(page);
	await expect(day(page, LAST_DAY)).toContainText('Socks');

	// day → Universal
	await dndDrag(page, socksIn(day(page, LAST_DAY)), universal(page));
	await settle(page);

	await expect(universal(page)).toContainText('Socks');
	await expect(day(page, LAST_DAY)).not.toContainText('Socks');
});

test('clothing drag — Universal ↔ Backup (both directions persist)', async ({
	page,
}) => {
	await gotoListBoard(page);
	await expect(universal(page)).toContainText('Socks');

	// Universal → Backup (the lanes sit side-by-side → short, reliable).
	await dndDrag(page, socksIn(universal(page)), backup(page));
	await settle(page);
	await expect(backup(page)).toContainText('Socks');
	await expect(universal(page)).not.toContainText('Socks');

	// Backup → Universal (back)
	await dndDrag(page, socksIn(backup(page)), universal(page));
	await settle(page);
	await expect(universal(page)).toContainText('Socks');
	await expect(backup(page)).not.toContainText('Socks');
});

test('clothing drag — day → Backup', async ({ page }) => {
	await gotoListBoard(page);

	// Precondition: park the socks on the last day (reliable adjacent move).
	await dndDrag(page, socksIn(universal(page)), day(page, LAST_DAY));
	await settle(page);
	await expect(day(page, LAST_DAY)).toContainText('Socks');

	// day → Backup
	await dndDrag(page, socksIn(day(page, LAST_DAY)), backup(page));
	await settle(page);

	await expect(backup(page)).toContainText('Socks');
	await expect(day(page, LAST_DAY)).not.toContainText('Socks');
});

test('clothing drag — Backup → day', async ({ page }) => {
	await gotoListBoard(page);

	// Precondition: move the socks into Backup (side-by-side lane move).
	await dndDrag(page, socksIn(universal(page)), backup(page));
	await settle(page);
	await expect(backup(page)).toContainText('Socks');

	// Backup → day (adjacent: last day abuts the lanes)
	await dndDrag(page, socksIn(backup(page)), day(page, LAST_DAY));
	await settle(page);

	await expect(day(page, LAST_DAY)).toContainText('Socks');
	await expect(backup(page)).not.toContainText('Socks');
});
