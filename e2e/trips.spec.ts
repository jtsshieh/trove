import { execSync } from 'node:child_process';

import { expect, test, type Page } from '@playwright/test';

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

// Open the Create Trip dialog and fill the name + a date range, then submit.
// createTrip redirects to /dashboard/<id> on success.
async function createTrip(page: Page, name: string): Promise<void> {
	await page.getByRole('button', { name: 'Create Trip' }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();

	await dialog.getByPlaceholder('Give your trip a nice title').fill(name);

	// Open the range calendar popover and pick a start + end day. The popover opens
	// on the current month (no defaultMonth in create mode). Each day IS a <button>
	// with data-day set by toLocaleDateString() — en-US "M/D/YYYY" under Playwright's
	// default browser locale. Today is mid-June 2026, so these days are in view.
	await dialog.getByText('Select the dates of your trip').click();
	const popover = page.locator('[data-slot="popover-content"]');
	await expect(popover).toBeVisible();
	// The range calendar needs a deliberate 2-click range (start then a distinct
	// end). The popover stays open after the first click and auto-closes only once
	// two distinct endpoints exist.
	await popover.locator('[data-day="6/22/2026"]').click({ force: true });
	await popover.locator('[data-day="6/24/2026"]').click({ force: true });
	await expect(popover).toBeHidden();

	await dialog.getByRole('button', { name: 'Save changes' }).click();
}

test('create trip — date range stays open until two distinct days are picked', async ({
	page,
}) => {
	await page.goto('/dashboard');
	await page.waitForLoadState('networkidle').catch(() => {});

	await page.getByRole('button', { name: 'Create Trip' }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();

	await dialog.getByText('Select the dates of your trip').click();
	const popover = page.locator('[data-slot="popover-content"]');
	await expect(popover).toBeVisible();

	// First click sets the start; the popover MUST remain open so the user can pick
	// an end day (the old bug closed here after one click).
	await popover.locator('[data-day="6/22/2026"]').click({ force: true });
	await expect(popover).toBeVisible();

	// A second, distinct day completes the range and auto-closes the popover.
	await popover.locator('[data-day="6/26/2026"]').click({ force: true });
	await expect(popover).toBeHidden();

	// Both endpoints land in the trigger field.
	await expect(dialog.getByText('Jun 22, 2026 - Jun 26, 2026')).toBeVisible();
});

test('create trip — Done confirms a single-day range', async ({ page }) => {
	await page.goto('/dashboard');
	await page.waitForLoadState('networkidle').catch(() => {});

	await page.getByRole('button', { name: 'Create Trip' }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();

	await dialog.getByText('Select the dates of your trip').click();
	const popover = page.locator('[data-slot="popover-content"]');
	await expect(popover).toBeVisible();

	// One click selects a single day (from === to); the popover stays open.
	await popover.locator('[data-day="6/22/2026"]').click({ force: true });
	await expect(popover).toBeVisible();

	// Done closes the popover, keeping the single-day range.
	await popover.getByRole('button', { name: 'Done' }).click();
	await expect(popover).toBeHidden();
	await expect(dialog.getByText('Jun 22, 2026 - Jun 22, 2026')).toBeVisible();
});

test('dashboard — create a trip shows it in the trips list', async ({
	page,
}) => {
	const name = 'QA Trip Create';
	await page.goto('/dashboard');
	await page.waitForLoadState('networkidle').catch(() => {});

	await createTrip(page, name);

	// Creating redirects into the trip viewer; head back to the dashboard list.
	await expect(page).toHaveURL(/\/dashboard\/[^/]+$/);
	await page.goto('/dashboard');
	await page.waitForLoadState('networkidle').catch(() => {});

	await expect(page.getByText(name)).toBeVisible();
});

test('dashboard — open a trip lands on the trip viewer', async ({ page }) => {
	const name = 'QA Trip Open';
	await page.goto('/dashboard');
	await page.waitForLoadState('networkidle').catch(() => {});

	await createTrip(page, name);
	await expect(page).toHaveURL(/\/dashboard\/[^/]+$/);

	// Return to the dashboard and open the trip via its Open link.
	await page.goto('/dashboard');
	await page.waitForLoadState('networkidle').catch(() => {});

	// Find our trip's card and click its Open link (client-side nav, so wait for
	// the URL to actually change rather than a network-idle that fires too early).
	const card = page.locator('[data-slot="card"]').filter({ hasText: name });
	await card.locator('a:has-text("Open")').click();
	await page.waitForURL(/\/dashboard\/[^/]+$/);

	// The name appears as both the sidebar h1 and the overview h1 — assert the nav's.
	await expect(
		page.locator('nav').getByRole('heading', { name }),
	).toBeVisible();
});

test('manage — rename then delete a trip', async ({ page }) => {
	const name = 'QA Trip Manage';
	const renamed = 'QA Trip Renamed';

	await page.goto('/dashboard');
	await page.waitForLoadState('networkidle').catch(() => {});
	// createTrip redirects straight into the new trip, so use that URL directly.
	await createTrip(page, name);
	await page.waitForURL(/\/dashboard\/[^/]+$/);
	const tripUrl = new URL(page.url()).pathname;

	await page.goto(`${tripUrl}/manage`);
	await page.waitForLoadState('networkidle').catch(() => {});

	// Rename via the inline edit form on the manage page. Wait for the success
	// toast (it fires after editTrip resolves) before reloading, so the rename has
	// actually persisted.
	const nameField = page.getByPlaceholder('Give your trip a nice title');
	await nameField.fill(renamed);
	await page.getByRole('button', { name: 'Save changes' }).click();
	await expect(page.getByText('Edited the trip successfully')).toBeVisible();

	await page.reload();
	await page.waitForLoadState('networkidle').catch(() => {});
	await expect(
		page.locator('nav').getByRole('heading', { name: renamed }),
	).toBeVisible();

	// Delete via the destructive Delete Trip dialog.
	await page.getByRole('button', { name: 'Delete Trip' }).click();
	const deleteDialog = page.getByRole('dialog');
	await expect(deleteDialog).toBeVisible();
	await deleteDialog.getByRole('button', { name: 'Delete' }).click();

	await page.waitForLoadState('networkidle').catch(() => {});
	await expect(page).toHaveURL(/\/dashboard$/);
	await expect(page.getByText(renamed)).toHaveCount(0);
});
