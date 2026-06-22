import { execSync } from 'node:child_process';

import { expect, test, type Page } from '@playwright/test';

import { dndDrag } from './helpers/dnd';

// The containers board is tall; give it room so off-screen drop zones are
// reachable. 1366 wide keeps the desktop sidebar (with the mode Select) visible.
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

/** Switch the trip to a mode via the sidebar Select, then wait for the nav to react. */
async function switchTripMode(page: Page, mode: string): Promise<void> {
	// The mode Select lives in the sidebar <nav>; scope to it (the Home page has
	// its own quick-link controls that would otherwise match).
	await page.locator('nav').getByRole('combobox').first().click();
	await page.getByRole('option', { name: mode }).click();
	// changeTripMode is a server action that revalidates the trip layout; the nav
	// re-renders once it resolves.
	await page.waitForLoadState('networkidle').catch(() => {});
}

test('packing — switch the trip to Pack mode from the sidebar', async ({
	page,
}) => {
	await gotoBoard(page, '');
	// The sidebar nav items are Base UI Buttons rendering a Link — role "button".
	const nav = page.locator('nav');
	// Provisioning is the seeded default; the sidebar shows the Clothing tab.
	await expect(nav.getByRole('button', { name: 'Clothing' })).toBeVisible();

	await switchTripMode(page, 'Packing');

	// Pack mode drops the Clothing/Essentials tabs and keeps Containers/Luggage.
	await expect(nav.getByRole('button', { name: 'Clothing' })).toHaveCount(0);
	await expect(nav.getByRole('button', { name: 'Containers' })).toBeVisible();
});

test('packing — mark an item packed in a container and persist it', async ({
	page,
}) => {
	// In Provision mode, drag a pool item into the seeded (empty) Packing Cube so
	// the Pack view has something to check off.
	await gotoBoard(page, '/containers');
	const cube = page.locator(
		'[data-testid="container-card"][data-name="Packing Cube"]',
	);
	await expect(cube).toBeVisible();

	await dndDrag(page, page.getByText('Black Uniqlo Hoodie').first(), cube);
	await page.waitForTimeout(1200);
	await page.reload();
	await expect(cube).toContainText('Hoodie');

	// Switch to Pack mode; the /containers route now renders the packing view.
	await switchTripMode(page, 'Packing');
	await gotoBoard(page, '/containers');

	// The Pack view lists the Hoodie with an unchecked checkbox.
	await expect(page.getByText('Black Uniqlo Hoodie')).toBeVisible();
	// Per-card progress starts at 0/1.
	await expect(page.getByText('0/1')).toBeVisible();

	// The checkbox flips OPTIMISTICALLY (off the query cache) the instant it's
	// clicked, so wait for the PATCH to actually persist before reloading —
	// otherwise the reload aborts the in-flight request and the toggle is lost.
	const checkbox = page.getByRole('checkbox').first();
	await expect(checkbox).not.toBeChecked();
	await Promise.all([
		page.waitForResponse(
			(r) =>
				new URL(r.url()).pathname.endsWith('/packed') &&
				r.request().method() === 'PATCH',
		),
		checkbox.click(),
	]);
	await expect(checkbox).toBeChecked();

	// The card progress advances to 1/1 once the only item is packed.
	await expect(page.getByText('1/1')).toBeVisible();

	await page.reload();

	// Persisted: the checkbox is still checked and progress is still 1/1.
	await expect(page.getByRole('checkbox').first()).toBeChecked();
	await expect(page.getByText('1/1')).toBeVisible();
});
