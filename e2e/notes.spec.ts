import { execSync } from 'node:child_process';

import { expect, test, type Page } from '@playwright/test';

// The boards are tall; give them room so off-screen drop zones are reachable.
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

test('notes — add an inline note to the first day', async ({ page }) => {
	await gotoBoard(page, '/clothing');
	const firstDay = page.getByTestId('day-column').nth(0);

	await firstDay.getByRole('button', { name: /Add a note/ }).click();
	const textarea = firstDay.getByPlaceholder('Add a note…');
	await textarea.fill('Flight 9am');
	await textarea.press('Enter');

	await page.waitForTimeout(800);
	await page.reload();

	await expect(page.getByTestId('day-column').nth(0)).toContainText(
		'Flight 9am',
	);
});

test('notes — edit an existing note in place', async ({ page }) => {
	await gotoBoard(page, '/clothing');
	const firstDay = page.getByTestId('day-column').nth(0);

	await firstDay.getByRole('button', { name: /Add a note/ }).click();
	const textarea = firstDay.getByPlaceholder('Add a note…');
	await textarea.fill('Flight 9am');
	await textarea.press('Enter');

	await page.waitForTimeout(800);
	await page.reload();

	const dayWithNote = page.getByTestId('day-column').nth(0);
	await dayWithNote.getByRole('button', { name: 'Flight 9am' }).click();
	const editTextarea = dayWithNote.getByPlaceholder('Add a note…');
	await editTextarea.fill('Red eye');
	await editTextarea.press('Enter');

	await page.waitForTimeout(800);
	await page.reload();

	await expect(page.getByTestId('day-column').nth(0)).toContainText('Red eye');
	await expect(page.getByTestId('day-column').nth(0)).not.toContainText(
		'Flight 9am',
	);
});
