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
	await page.goto('/trips');
	await page.getByRole('button', { name: 'Create Trip' }).click();
	await page.getByPlaceholder('Give your trip a nice title').fill('Beach Week');
	await page.keyboard.press('Escape');

	// Trip overview (was a <div>-in-<p> hydration error) and every board.
	const href = await page
		.locator('a:has-text("Open")')
		.first()
		.getAttribute('href');
	for (const path of [
		'',
		'/clothing',
		'/essentials',
		'/containers',
		'/luggage',
	]) {
		await page.goto(`${href}${path}`);
		await page.waitForLoadState('networkidle').catch(() => {});
		await page.waitForTimeout(400);
	}

	// Wardrobe bulk-add dialog — dropping photos must not log React-19 teardown
	// errors (Toggle/Select mount churn, object-URL previews).
	await page.goto('/closet/clothing');
	await page.waitForLoadState('networkidle').catch(() => {});
	await page.getByTestId('bulk-add-trigger').click();
	await expect(page.getByTestId('bulk-add-dialog')).toBeVisible();
	await page
		.getByTestId('bulk-file-input')
		.setInputFiles(path.join(process.cwd(), 'e2e/fixtures/shirt.png'));
	await expect(page.getByTestId('bulk-tile')).toHaveCount(1);
	await page.keyboard.press('Escape');
	await page.waitForTimeout(400);

	const meaningful = errors.filter((e) => !BENIGN.some((b) => b.test(e)));
	expect(meaningful, `\n${meaningful.join('\n')}\n`).toEqual([]);
});

test('no console errors across the house-inventory apps', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
	page.on('console', (m) => {
		if (m.type() === 'error') errors.push(`CONSOLE: ${m.text()}`);
	});

	// Documents + Electronics list surfaces.
	for (const route of ['/documents', '/electronics']) {
		await page.goto(route);
		await page.waitForLoadState('networkidle').catch(() => {});
		await page.waitForTimeout(300);
	}

	// Bathroom — every nature tab is now its own route (catalog Selects, stock
	// steppers, unit rows).
	for (const route of [
		'/bathroom/consumables',
		'/bathroom/appliances',
		'/bathroom/launderables',
		'/bathroom/catalog',
	]) {
		await page.goto(route);
		await page.waitForLoadState('networkidle').catch(() => {});
		await page.waitForTimeout(300);
	}

	// The nature-driven add-product dialog (the Select churn that logged the
	// uncontrolled→controlled warning) must mount + switch nature cleanly.
	await page.getByRole('button', { name: 'Add product' }).first().click();
	await expect(page.getByRole('dialog')).toBeVisible();
	await page.getByText('Consumable, appliance, or launderable').click();
	await page.getByRole('option', { name: 'Appliance', exact: true }).click();
	await page.keyboard.press('Escape');
	await page.waitForTimeout(300);

	const meaningful = errors.filter((e) => !BENIGN.some((b) => b.test(e)));
	expect(meaningful, `\n${meaningful.join('\n')}\n`).toEqual([]);
});

test('no hydration mismatch when the closet was left open on reload', async ({
	page,
}) => {
	// Open the clothing board's closet so the "open" preference is saved, then reload.
	// The closet state lives in a provider outside the board's Suspense boundary, so
	// restoring it must not flip the value before the board hydrates (regression: the
	// docked closet div mismatched aria-hidden/className on hydration).
	await page.goto('/trips');
	const href = await page
		.locator('a:has-text("Open")')
		.first()
		.getAttribute('href');
	if (!href) throw new Error('no seeded trip');
	await page.goto(`${href}/clothing`);
	await page.waitForLoadState('networkidle').catch(() => {});
	// The board's Closet toggle carries aria-pressed (the global nav "Closet" link
	// does not) — disambiguate, and open the docked panel.
	await page
		.getByRole('button', { name: 'Closet' })
		.and(page.locator('[aria-pressed]'))
		.click();
	await expect(page.getByTestId('closet-panel')).toBeVisible();

	// Now reload with the preference saved and watch for hydration errors.
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
	page.on('console', (m) => {
		if (m.type() === 'error') errors.push(`CONSOLE: ${m.text()}`);
	});
	await page.reload();
	await expect(page.getByTestId('closet-panel')).toBeVisible();
	await page.waitForTimeout(600);

	const hydration = errors.filter((e) => /hydrat/i.test(e));
	expect(hydration, `\n${hydration.join('\n')}\n`).toEqual([]);
});
