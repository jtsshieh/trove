import fs from 'node:fs';

import { expect, test } from '@playwright/test';

test('auth protects the dashboard', async ({ page, context }) => {
	await page.goto('/trip-planner');
	await expect(
		page.getByRole('heading', { name: 'Trips', exact: true }),
	).toBeVisible();
	await context.clearCookies();
	await page.goto('/trip-planner');
	await expect(page).toHaveURL(/\/sign-in/);
});

test('explore every board, capturing runtime errors + screenshots', async ({
	page,
}) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
	page.on('console', (m) => {
		if (m.type() === 'error') errors.push(`CONSOLE: ${m.text()}`);
	});

	const dir = 'test-results/explore';
	fs.mkdirSync(dir, { recursive: true });

	await page.goto('/trip-planner');
	const openHref = await page
		.locator('a:has-text("Open")')
		.first()
		.getAttribute('href');
	expect(openHref).toMatch(/\/trip-planner\/[^/]+$/);
	const base = openHref!;
	await page.goto(base);
	await page.waitForLoadState('networkidle').catch(() => {});
	await page.screenshot({ path: `${dir}/overview.png`, fullPage: true });

	for (const path of ['/clothing', '/essentials', '/containers', '/luggage', '/manage']) {
		errors.push(`\n----- ${path} -----`);
		await page.goto(base + path);
		await page.waitForLoadState('networkidle').catch(() => {});
		await page.waitForTimeout(800);
		await page.screenshot({
			path: `${dir}${path.replace(/\//g, '-')}.png`,
			fullPage: true,
		});
	}

	errors.push('\n----- /outfits -----');
	await page.goto('/outfits');
	await page.waitForLoadState('networkidle').catch(() => {});
	await page.waitForTimeout(500);
	await page.screenshot({ path: `${dir}/outfits.png`, fullPage: true });

	errors.push('\n----- /closet/clothing -----');
	await page.goto('/closet/clothing');
	await page.waitForLoadState('networkidle').catch(() => {});
	await page.screenshot({ path: `${dir}/wardrobe.png`, fullPage: true });

	fs.writeFileSync(`${dir}/errors.txt`, errors.join('\n'));
});
