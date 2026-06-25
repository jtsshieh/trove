import { execSync } from 'node:child_process';

import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 1366, height: 2000 } });

test.beforeEach(async ({ page }) => {
	execSync('npx tsx e2e/reset-and-seed.ts', { stdio: 'ignore' });
	await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('documents shows the seeded names', async ({ page }) => {
	await page.goto('/documents');
	await expect(
		page.getByRole('heading', { name: 'Documents', exact: true }),
	).toBeVisible();
	const rows = page.getByTestId('document-row');
	await expect(rows.filter({ hasText: 'Passport' })).toBeVisible();
	await expect(rows.filter({ hasText: 'Insurance card' })).toBeVisible();
});

test('documents — add a name-only document persists', async ({ page }) => {
	await page.goto('/documents');
	await page.getByRole('button', { name: 'Add Document' }).first().click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	await dialog
		.getByPlaceholder('Enter a name for this document')
		.fill('Boarding pass');
	await dialog.getByRole('button', { name: 'Save changes' }).click();
	await expect(dialog).not.toBeVisible();

	await page.reload();
	await expect(
		page
			.getByTestId('document-row')
			.filter({ hasText: 'Boarding pass' })
			.first(),
	).toBeVisible();
});
