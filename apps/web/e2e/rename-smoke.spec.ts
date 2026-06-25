import { execSync } from 'node:child_process';

import { expect, test } from '@playwright/test';

test.beforeEach(async () => {
	execSync('npx tsx e2e/reset-and-seed.ts', { stdio: 'ignore' });
});

test('launcher shows the Trove brand and every house-inventory app', async ({
	page,
}) => {
	await page.goto('/');
	await expect(page.getByText('Trove', { exact: true }).first()).toBeVisible();
	for (const name of [
		'Closet',
		'Bathroom',
		'Electronics',
		'Documents',
		'Trips',
	]) {
		await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
	}
});

test('the rename kept the closet clothing app intact', async ({ page }) => {
	await page.goto('/closet/clothing');
	await expect(page.getByTestId('wardrobe-card').first()).toBeVisible();
});
