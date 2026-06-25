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

test('outfits — create an ad-hoc outfit on a day', async ({ page }) => {
	await gotoBoard(page, '/clothing');
	const day0 = page.getByTestId('day-column').nth(0);
	await expect(day0.getByTestId('outfit-group')).toHaveCount(0);

	await day0.getByTestId('add-outfit').click();
	await page.waitForTimeout(800);
	await expect(day0.getByTestId('outfit-group')).toHaveCount(1);

	await page.reload();
	const day0After = page.getByTestId('day-column').nth(0);
	await expect(day0After.getByTestId('outfit-group')).toHaveCount(1);
	// A nameless ad-hoc outfit renders the default "Outfit" label + drop hint.
	await expect(day0After.getByTestId('outfit-group')).toContainText('Outfit');
	await expect(day0After.getByTestId('outfit-group')).toContainText(
		'Drop pieces here',
	);
});

test('outfits — drag a loose piece into the outfit group', async ({ page }) => {
	await gotoBoard(page, '/clothing');
	const day0 = page.getByTestId('day-column').nth(0);

	await day0.getByTestId('add-outfit').click();
	await page.waitForTimeout(800);
	const group = day0.getByTestId('outfit-group');
	await expect(group).toHaveCount(1);

	// The hoodie is seeded as a loose piece on day 1 (column index 0).
	await dndDrag(
		page,
		day0.getByText('Black Uniqlo Hoodie').first(),
		group,
	);
	await page.waitForTimeout(1200);
	await page.reload();

	await expect(
		page.getByTestId('day-column').nth(0).getByTestId('outfit-group'),
	).toContainText('Hoodie');
});

test('outfits — collapsing hides the content (no blank box)', async ({
	page,
}) => {
	await gotoBoard(page, '/clothing');
	const day0 = page.getByTestId('day-column').nth(0);

	await day0.getByTestId('add-outfit').click();
	await page.waitForTimeout(800);
	const group = day0.getByTestId('outfit-group');
	await expect(group).toHaveCount(1);

	// Expanded: the empty grouping shows its drop hint, which occupies height.
	const hint = group.getByText('Drop pieces here');
	await expect(hint).toBeVisible();
	const expandedBox = await group.boundingBox();

	// Collapse via the header toggle.
	await group.getByRole('button', { expanded: true }).first().click();
	await page.waitForTimeout(500);

	// The content region fully collapses — the grid-rows-[0fr] + min-h-0 fix means
	// no blank box is left behind (the bug left the group at ~its expanded height).
	const collapsedBox = await group.boundingBox();
	if (!expandedBox || !collapsedBox) throw new Error('outfit group not visible');
	expect(collapsedBox.height).toBeLessThan(expandedBox.height);
	// Header-only height is small (~49px); the blank-box bug left ~the expanded
	// height. 64 cleanly separates header-only from any retained content region.
	expect(collapsedBox.height).toBeLessThan(64);
});

test('outfits — save a day grouping as a reusable template', async ({
	page,
}) => {
	await gotoBoard(page, '/clothing');
	const day0 = page.getByTestId('day-column').nth(0);

	await day0.getByTestId('add-outfit').click();
	await page.waitForTimeout(800);
	const group = day0.getByTestId('outfit-group');
	await expect(group).toHaveCount(1);

	// Group a seeded loose piece into it so the template has content to snapshot.
	await dndDrag(page, day0.getByText('Black Uniqlo Hoodie').first(), group);
	await page.waitForTimeout(1200);
	await expect(
		page.getByTestId('day-column').nth(0).getByTestId('outfit-group'),
	).toContainText('Hoodie');

	// Save it as a reusable outfit.
	const savedGroup = page.getByTestId('day-column').nth(0).getByTestId('outfit-group');
	await savedGroup
		.getByRole('button', { name: /Save .* as a reusable outfit/ })
		.click();
	await page.getByLabel('Outfit name').fill('Saved From Day');
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await page.waitForTimeout(800);

	// It now appears as a template in the closet's Outfits tab.
	await page.getByRole('button', { name: 'Closet' }).click();
	const closet = page.getByTestId('closet-panel');
	await closet.getByRole('tab', { name: 'Outfits' }).click();
	await expect(
		closet.locator('[data-testid="closet-outfit"][data-name="Saved From Day"]'),
	).toBeVisible();
});
