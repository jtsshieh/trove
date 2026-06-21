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

async function gotoEssentials(page: Page): Promise<void> {
	await page.goto('/dashboard');
	const href = await page
		.locator('a:has-text("Open")')
		.first()
		.getAttribute('href');
	if (!href) throw new Error('no seeded trip');
	await page.goto(`${href}/essentials`);
	await page.waitForLoadState('networkidle').catch(() => {});
}

// The trip essentials board groups by category (Toiletry/Document/Electronic),
// not by Universal/Backup. Each lane is a category-lane; items are free-floating
// or inside a sub-group the user created/imported.
function lane(page: Page, category: 'Toiletry' | 'Document' | 'Electronic') {
	return page.locator(
		`[data-testid="category-lane"][data-category="${category}"]`,
	);
}

// Add essentials via the header "Add" popover (MultiSelectCommand + "Add N").
async function addEssentials(page: Page, names: string[]): Promise<void> {
	await page.getByRole('button', { name: 'Add', exact: true }).click();
	const search = page.getByPlaceholder('Search essentials…');
	await expect(search).toBeVisible();
	for (const name of names) {
		await search.fill(name);
		await page.getByRole('option', { name }).click();
	}
	await page.getByRole('button', { name: /^Add \d+$/ }).click();
	await expect(search).toBeHidden();
}

test('essentials — add an essential to its category lane', async ({ page }) => {
	await gotoEssentials(page);
	const toiletries = lane(page, 'Toiletry');
	await expect(toiletries).toBeVisible();
	await expect(toiletries).not.toContainText('Toothbrush');

	await addEssentials(page, ['Toothbrush']);
	await page.waitForTimeout(800);
	await page.reload();

	await expect(lane(page, 'Toiletry')).toContainText('Toothbrush');
});

test('essentials — drag an essential into a sub-group', async ({ page }) => {
	await gotoEssentials(page);
	await addEssentials(page, ['Toothbrush']);
	await page.waitForTimeout(800);
	await page.reload();

	// Create a sub-group inside the Toiletries lane.
	const toiletries = lane(page, 'Toiletry');
	await toiletries.getByRole('button', { name: 'Add a sub-group' }).click();
	const subgroup = toiletries.getByTestId('essential-subgroup');
	await expect(subgroup).toBeVisible();

	// Drag the free Toothbrush tile into the sub-group's drop zone.
	await dndDrag(page, toiletries.getByText('Toothbrush').first(), subgroup);
	await page.waitForTimeout(1200);
	await page.reload();

	await expect(
		lane(page, 'Toiletry').getByTestId('essential-subgroup'),
	).toContainText('Toothbrush');
});

test('essentials — remove an essential from the board', async ({ page }) => {
	await gotoEssentials(page);
	await addEssentials(page, ['Passport']);
	await page.waitForTimeout(800);
	await page.reload();

	const documents = lane(page, 'Document');
	await expect(documents).toContainText('Passport');

	// Wait for the DELETE to persist before reloading (the tile clears optimistically
	// via cache invalidation; reloading too early would abort the in-flight request).
	await Promise.all([
		page.waitForResponse(
			(r) =>
				/\/api\/essential-provisions\/[^/]+$/.test(new URL(r.url()).pathname) &&
				r.request().method() === 'DELETE',
		),
		documents
			.getByRole('button', { name: 'Remove Passport', exact: true })
			.click(),
	]);
	await page.waitForTimeout(300);
	await page.reload();

	await expect(lane(page, 'Document')).not.toContainText('Passport');
});
