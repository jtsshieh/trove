import { execSync } from 'node:child_process';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

// Bulk add for packing gear (containers + luggage). Like the wardrobe bulk add, we
// never hit a real model or MinIO: /api/upload, /api/remove-background, and the two
// gear /scan routes are stubbed so the pipeline is deterministic, and we drive the
// draft rows + the real create routes by hand.
test.beforeEach(async ({ page }) => {
	execSync('npx tsx e2e/reset-and-seed.ts', { stdio: 'ignore' });
	await page.emulateMedia({ reducedMotion: 'reduce' });
});

const shirt = path.join(process.cwd(), 'e2e/fixtures/shirt.png');
const pants = path.join(process.cwd(), 'e2e/fixtures/pants.png');

// 1x1 transparent PNG — the body /api/remove-background would return.
const PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
	'base64',
);

// Stub uploads, background removal, and the gear scan routes so no MinIO/model is hit.
async function stubPipeline(page: Page): Promise<void> {
	let n = 0;
	await page.route('**/api/upload', async (route) => {
		n += 1;
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ key: `e2e/gear-${n}.webp` }),
		});
	});
	await page.route('**/api/remove-background', async (route) => {
		await route.fulfill({ status: 200, contentType: 'image/png', body: PNG });
	});
	// Scan returns no suggestion (the model is never exercised); the row leaves the
	// scanning state so the fields become editable.
	for (const url of ['**/api/containers/scan', '**/api/luggage/scan']) {
		await page.route(url, async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ suggestion: null }),
			});
		});
	}
}

// Base UI Selects render options in a portal; center the option before clicking so a
// scroll arrow doesn't intercept it (same pattern as the wardrobe bulk-add spec).
async function pickOption(page: Page, name: string): Promise<void> {
	const option = page.getByRole('option', { name, exact: true });
	await option.waitFor();
	await option.evaluate((el) =>
		el.scrollIntoView({ block: 'center', behavior: 'instant' }),
	);
	await option.click();
}

test('containers bulk add — continue → run → fill → create persists each container', async ({
	page,
}) => {
	await stubPipeline(page);
	await page.goto('/dashboard/packing-gear/containers');

	await page.getByTestId('container-bulk-add-trigger').click();
	const dialog = page.getByTestId('container-bulk-add-dialog');
	await expect(dialog).toBeVisible();

	await dialog.getByTestId('bulk-file-input').setInputFiles([shirt, pants]);
	await expect(dialog.getByTestId('bulk-tile')).toHaveCount(2);

	await dialog.getByTestId('bulk-continue').click();
	const rows = dialog.getByTestId('bulk-draft-row');
	await expect(rows).toHaveCount(2);

	// Both checkboxes default on: "Run on all" removes backgrounds + scans in parallel.
	await dialog.getByTestId('bulk-run').click();
	for (const row of await rows.all()) {
		await expect(row).toHaveAttribute('data-bg', 'done', { timeout: 15000 });
		await expect(row).toHaveAttribute('data-scan', /done|error/, {
			timeout: 15000,
		});
	}

	const fillRow = async (index: number, name: string, type: string) => {
		const row = rows.nth(index);
		await row.getByTestId('bulk-name').fill(name);
		await row.getByTestId('bulk-type').click();
		await pickOption(page, type);
	};
	// Names chosen not to collide with the page's description copy.
	await fillRow(0, 'Mesh Cube X1', 'Clothes');
	await fillRow(1, 'Wash Kit X2', 'Essentials');

	await dialog.getByTestId('bulk-create-all').click();
	await expect(dialog).not.toBeVisible({ timeout: 15000 });

	await expect(page.getByText('Mesh Cube X1', { exact: true })).toBeVisible();
	await expect(page.getByText('Wash Kit X2', { exact: true })).toBeVisible();
	await page.reload();
	await page.waitForLoadState('networkidle').catch(() => {});
	await expect(page.getByText('Mesh Cube X1', { exact: true })).toBeVisible();
});

test('luggage bulk add — continue → run → fill → create persists each bag', async ({
	page,
}) => {
	await stubPipeline(page);
	await page.goto('/dashboard/packing-gear/luggage');

	await page.getByTestId('luggage-bulk-add-trigger').click();
	const dialog = page.getByTestId('luggage-bulk-add-dialog');
	await expect(dialog).toBeVisible();

	await dialog.getByTestId('bulk-file-input').setInputFiles([shirt, pants]);
	await expect(dialog.getByTestId('bulk-tile')).toHaveCount(2);

	await dialog.getByTestId('bulk-continue').click();
	const rows = dialog.getByTestId('bulk-draft-row');
	await expect(rows).toHaveCount(2);

	await dialog.getByTestId('bulk-run').click();
	for (const row of await rows.all()) {
		await expect(row).toHaveAttribute('data-bg', 'done', { timeout: 15000 });
		await expect(row).toHaveAttribute('data-scan', /done|error/, {
			timeout: 15000,
		});
	}

	// Names chosen not to collide with the page's description copy.
	await rows.nth(0).getByTestId('bulk-name').fill('Roller X1');
	await rows.nth(1).getByTestId('bulk-name').fill('Daypack X2');

	await dialog.getByTestId('bulk-create-all').click();
	await expect(dialog).not.toBeVisible({ timeout: 15000 });

	await expect(page.getByText('Roller X1', { exact: true })).toBeVisible();
	await expect(page.getByText('Daypack X2', { exact: true })).toBeVisible();
});
