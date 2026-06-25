import { execSync } from 'node:child_process';

import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 1366, height: 2000 } });

test.beforeEach(async ({ page }) => {
	execSync('npx tsx e2e/reset-and-seed.ts', { stdio: 'ignore' });
	await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('templates — create a reusable bundle of items persists', async ({
	page,
}) => {
	await page.goto('/trips/templates');
	await expect(
		page.getByRole('heading', { name: 'Templates', exact: true }),
	).toBeVisible();

	await page.getByRole('button', { name: 'Create template' }).first().click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();

	await dialog
		.getByPlaceholder('Enter a name for this template')
		.fill('Toiletry Kit');
	// Pick a polymorphic item from the gallery (items span the three apps).
	await dialog.getByRole('button', { name: /Toothbrush/ }).first().click();
	await dialog.getByRole('button', { name: /^(Save|Create)/ }).click();
	await expect(dialog).not.toBeVisible();

	await page.reload();
	await expect(page.getByText('Toiletry Kit')).toBeVisible();
});
