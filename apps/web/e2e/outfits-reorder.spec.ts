import { execSync } from 'node:child_process';

import { expect, test, type Page } from '@playwright/test';

import { dndDrag } from './helpers/dnd';

test.use({ viewport: { width: 1366, height: 2200 } });

test.beforeEach(async ({ page }) => {
	execSync('npx tsx e2e/reset-and-seed.ts', { stdio: 'ignore' });
	await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function gotoClothing(page: Page): Promise<void> {
	await page.goto('/trip-planner');
	const href = await page
		.locator('a:has-text("Open")')
		.first()
		.getAttribute('href');
	if (!href) throw new Error('no seeded trip');
	await page.goto(`${href}/clothing`);
	await page.waitForLoadState('networkidle').catch(() => {});
	await page.getByRole('tab', { name: 'List' }).click();
}

const outfitIds = (day: ReturnType<Page['locator']>) =>
	day
		.getByTestId('outfit-group')
		.evaluateAll((els) => els.map((e) => e.getAttribute('data-outfit-id') ?? ''));

test('outfits reorder within a day (and stay separate from loose pieces)', async ({
	page,
}) => {
	await gotoClothing(page);
	const day = page.getByTestId('day-column').nth(0);

	// Create two ad-hoc outfits on day 0 (which already has loose Hoodie + Tee).
	await day.getByTestId('add-outfit').click();
	await page.waitForTimeout(500);
	await day.getByTestId('add-outfit').click();
	await page.waitForTimeout(800);
	await page.reload();
	await page.getByRole('tab', { name: 'List' }).click();

	const day0 = page.getByTestId('day-column').nth(0);
	await expect(day0.getByTestId('outfit-group')).toHaveCount(2);
	// Loose pieces remain outside the outfit lane.
	await expect(day0).toContainText('Hoodie');
	// Let the streamed board hydrate before driving a pointer drag (the lifted-header
	// refactor streams the board, so an immediate drag can race a remount).
	await page.waitForTimeout(500);

	const [first, second] = await outfitIds(day0);

	// Drag the 2nd outfit (by its grip) above the 1st.
	await dndDrag(
		page,
		day0.getByTestId('outfit-group').nth(1).getByTestId('outfit-grip'),
		day0.getByTestId('outfit-group').nth(0),
	);
	await page.waitForTimeout(1200);
	await page.reload();
	await page.getByRole('tab', { name: 'List' }).click();

	const after = await outfitIds(page.getByTestId('day-column').nth(0));
	expect(after).toEqual([second, first]);
});

test('an outfit can be moved among the loose pieces (not pinned to the top)', async ({
	page,
}) => {
	await gotoClothing(page);
	// Day 0 has loose Hoodie + Tee; a new outfit appends after them.
	await page.getByTestId('day-column').nth(0).getByTestId('add-outfit').click();
	await page.waitForTimeout(800);
	await page.reload();
	await page.getByRole('tab', { name: 'List' }).click();

	const day0 = page.getByTestId('day-column').nth(0);
	const outfit = day0.getByTestId('outfit-group');
	const hoodie = day0.locator(
		'[data-testid="piece"][data-name="Black Uniqlo Hoodie"]',
	);
	await expect(outfit).toHaveCount(1);
	await expect(hoodie).toBeVisible();
	// Appended below the loose pieces to begin with.
	expect((await outfit.boundingBox())!.y).toBeGreaterThan(
		(await hoodie.boundingBox())!.y,
	);

	// Drag the outfit up, above the loose Hoodie — it should sit among the pieces.
	await dndDrag(page, outfit.getByTestId('outfit-grip'), hoodie);
	await page.waitForTimeout(1200);
	await page.reload();
	await page.getByRole('tab', { name: 'List' }).click();

	const day0b = page.getByTestId('day-column').nth(0);
	const outfitB = day0b.getByTestId('outfit-group');
	const hoodieB = day0b.locator(
		'[data-testid="piece"][data-name="Black Uniqlo Hoodie"]',
	);
	await expect(outfitB).toBeVisible();
	await expect(hoodieB).toBeVisible();
	expect((await outfitB.boundingBox())!.y).toBeLessThan(
		(await hoodieB.boundingBox())!.y,
	);
});
