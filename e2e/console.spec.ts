import path from 'node:path';

import { expect, test } from '@playwright/test';

// Framework/devtools noise that isn't an app bug.
const BENIGN = [
	/scroll-behavior/i,
	/React DevTools/i,
	/hydration-mismatch is deprecated/i,
	/Fast Refresh/i,
	/\[Fast Refresh\]/i,
];

test('no console errors across key surfaces and forms', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
	page.on('console', (m) => {
		if (m.type() === 'error') errors.push(`CONSOLE: ${m.text()}`);
	});

	// (The sign-in form's controlled-input fix is exercised by auth.setup.)
	// Dashboard + create-trip dialog — uncontrolled name input + nav button.
	await page.goto('/dashboard');
	await page.getByRole('button', { name: 'Create Trip' }).click();
	await page.getByPlaceholder('Give your trip a nice title').fill('Beach Week');
	await page.keyboard.press('Escape');

	// Trip overview (was a <div>-in-<p> hydration error) and every board.
	const href = await page
		.locator('a:has-text("Open")')
		.first()
		.getAttribute('href');
	for (const path of ['', '/clothing', '/essentials', '/containers', '/luggage']) {
		await page.goto(`${href}${path}`);
		await page.waitForLoadState('networkidle').catch(() => {});
		await page.waitForTimeout(400);
	}

	// Wardrobe bulk-add dialog — dropping photos must not log React-19 teardown
	// errors (Toggle/Select mount churn, object-URL previews).
	await page.goto('/dashboard/wardrobe');
	await page.waitForLoadState('networkidle').catch(() => {});
	await page.getByTestId('bulk-add-trigger').click();
	await expect(page.getByTestId('bulk-add-dialog')).toBeVisible();
	await page
		.getByTestId('bulk-file-input')
		.setInputFiles(path.join(process.cwd(), 'e2e/fixtures/shirt.png'));
	await expect(page.getByTestId('bulk-tile')).toHaveCount(1);
	await page.getByTestId('bulk-removebg-toggle').first().click();
	await page.keyboard.press('Escape');
	await page.waitForTimeout(400);

	const meaningful = errors.filter((e) => !BENIGN.some((b) => b.test(e)));
	expect(meaningful, `\n${meaningful.join('\n')}\n`).toEqual([]);
});
