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
	await page.goto('/dashboard');
	const href = await page
		.locator('a:has-text("Open")')
		.first()
		.getAttribute('href');
	if (!href) throw new Error('no seeded trip');
	await page.goto(`${href}${path}`);
	await page.waitForLoadState('networkidle').catch(() => {});
}

async function openCalendar(page: Page): Promise<void> {
	await gotoBoard(page, '/clothing');
	await page.getByRole('tab', { name: 'Calendar' }).click();
	await expect(page.getByTestId('calendar-grid')).toBeVisible();
}

test('calendar — piece names stay legible (never clipped to zero width)', async ({
	page,
}) => {
	await openCalendar(page);
	// The seeded pieces live on the first day (TUE Jun 30). Their full names must
	// render visibly — the image-forward calendar tile wraps the name beneath the
	// photo rather than truncating it away.
	const hoodie = page
		.getByTestId('day-column')
		.nth(0)
		.getByTestId('piece')
		.filter({ hasText: 'Black Uniqlo Hoodie' });
	await expect(hoodie).toBeVisible();
	await expect(hoodie).toContainText('Black Uniqlo Hoodie');

	const nameBox = await hoodie.getByText('Black Uniqlo Hoodie').boundingBox();
	if (!nameBox) throw new Error('piece name not laid out');
	// Guard against the old bug: a name crushed to ~0 width by sibling controls.
	expect(nameBox.width).toBeGreaterThan(40);
});

test('calendar — drag a piece between adjacent days', async ({ page }) => {
	await openCalendar(page);
	const day0 = page.getByTestId('day-column').nth(0);
	const day1 = page.getByTestId('day-column').nth(1);
	await expect(day0).toContainText('Hoodie');

	// Adjacent calendar columns → a short, reliable drag.
	await dndDrag(page, day0.getByText('Black Uniqlo Hoodie').first(), day1);
	await page.waitForTimeout(1200);
	await page.reload();

	// Stays on the calendar view (persisted setting) after reload.
	await expect(page.getByTestId('calendar-grid')).toBeVisible();
	await expect(page.getByTestId('day-column').nth(1)).toContainText('Hoodie');
	await expect(page.getByTestId('day-column').nth(0)).not.toContainText(
		'Hoodie',
	);
});

test('calendar — dragging over an occupied cell shows the drop-target ring', async ({
	page,
}) => {
	await openCalendar(page);
	const day0 = page.getByTestId('day-column').nth(0);
	const day1 = page.getByTestId('day-column').nth(1);
	// Day 0 already holds the hoodie + tee; dragging the hoodie over that occupied
	// cell must surface the brand drop-target ring (data-drop-target) on the cell.
	const hoodie = day0
		.getByTestId('piece')
		.filter({ hasText: 'Black Uniqlo Hoodie' });

	const from = await hoodie.boundingBox();
	// Aim at the tee tile (an occupied spot in the same cell) so the drop resolves
	// to the cell that already has pieces.
	const to = await day0
		.getByTestId('piece')
		.filter({ hasText: 'White Uniqlo T-shirt' })
		.boundingBox();
	if (!from || !to) throw new Error('pieces not visible');

	const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
	const end = { x: to.x + to.width / 2, y: to.y + to.height / 2 };

	await page.mouse.move(start.x, start.y);
	await page.mouse.down();
	const steps = 12;
	for (let i = 1; i <= steps; i++) {
		await page.mouse.move(
			start.x + ((end.x - start.x) * i) / steps,
			start.y + ((end.y - start.y) * i) / steps,
			{ steps: 2 },
		);
	}
	await page.mouse.move(end.x, end.y, { steps: 4 });
	await page.mouse.move(end.x, end.y);
	await page.waitForTimeout(150);

	// Something inside the occupied cell carries the live drop-target ring — either
	// the cell's drop zone or the targeted piece (insert-before).
	await expect(day0.locator('[data-drop-target="true"]').first()).toBeVisible();
	// Sanity: the (empty) sibling cell is not the active drop target.
	await expect(day1.locator('[data-drop-target="true"]')).toHaveCount(0);
	await page.mouse.up();
});

test('calendar — stacks day-by-day on a narrow viewport', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 1600 });
	await openCalendar(page);

	// Every trip day still renders as its own column with the canonical attrs.
	await expect(page.getByTestId('day-column')).toHaveCount(7);

	// The first day shows its full date (stacked layout) and a legible piece name.
	const day0 = page.getByTestId('day-column').nth(0);
	await expect(day0).toContainText('Jun 30');
	await expect(day0).toContainText('Black Uniqlo Hoodie');

	// Stacked = single column: day cells span (nearly) the full grid width, so the
	// second day sits below the first rather than beside it.
	const a = await page.getByTestId('day-column').nth(0).boundingBox();
	const b = await page.getByTestId('day-column').nth(1).boundingBox();
	if (!a || !b) throw new Error('day columns not laid out');
	expect(b.y).toBeGreaterThan(a.y + a.height - 4);
});
