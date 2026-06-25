import { execSync } from 'node:child_process';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

// Bulk scan-to-name for documents. Like the wardrobe bulk add, we never hit a real
// model or MinIO: /api/upload is stubbed so the pipeline is deterministic, and the
// scan route yields no name (no live model) — so each row reaches a terminal scan
// state with an empty name we fill by hand, then create persists name-only documents.
test.beforeEach(async ({ page }) => {
	execSync('npx tsx e2e/reset-and-seed.ts', { stdio: 'ignore' });
	await page.emulateMedia({ reducedMotion: 'reduce' });
});

const shirt = path.join(process.cwd(), 'e2e/fixtures/shirt.png');
const pants = path.join(process.cwd(), 'e2e/fixtures/pants.png');

// Stub the upload endpoint so no MinIO is hit. The scan route is NOT stubbed: with
// no live model it returns no suggestion, so rows reach data-scan=done|error and
// leave an empty name to fill in by hand.
async function stubPipeline(page: Page): Promise<void> {
	let n = 0;
	await page.route('**/api/upload', async (route) => {
		n += 1;
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ key: `e2e/doc-${n}.webp` }),
		});
	});
}

test('documents bulk add — continue → scan all → fill names → create persists each name-only document', async ({
	page,
}) => {
	await stubPipeline(page);
	await page.goto('/documents');

	await page.getByTestId('bulk-add-trigger').click();
	const dialog = page.getByTestId('bulk-add-dialog');
	await expect(dialog).toBeVisible();

	await dialog.getByTestId('bulk-file-input').setInputFiles([shirt, pants]);
	await expect(dialog.getByTestId('bulk-tile')).toHaveCount(2);

	// Continue to the review stage, where one row renders per photo.
	await dialog.getByTestId('bulk-continue').click();
	const rows = dialog.getByTestId('bulk-draft-row');
	await expect(rows).toHaveCount(2);

	// "Scan all" uploads + scans every row in parallel. With no live model each row
	// reaches a terminal state (done with an empty name, or error) — either way the
	// name field becomes fillable.
	await dialog.getByTestId('bulk-run').click();
	for (const row of await rows.all()) {
		await expect(row).toHaveAttribute('data-scan', /done|error/, {
			timeout: 15000,
		});
	}

	// Names chosen not to collide with the seeded documents (Passport, Insurance card).
	await rows.nth(0).getByTestId('bulk-name').fill('Boarding pass X1');
	await rows.nth(1).getByTestId('bulk-name').fill('Vaccination card X2');

	await dialog.getByTestId('bulk-create-all').click();
	await expect(dialog).not.toBeVisible({ timeout: 15000 });

	// Both name-only documents now live in the list and survive a reload.
	await page.reload();
	await page.waitForLoadState('networkidle').catch(() => {});

	await expect(
		page
			.getByTestId('document-row')
			.filter({ hasText: 'Boarding pass X1' }),
	).toBeVisible();
	await expect(
		page
			.getByTestId('document-row')
			.filter({ hasText: 'Vaccination card X2' }),
	).toBeVisible();
});
