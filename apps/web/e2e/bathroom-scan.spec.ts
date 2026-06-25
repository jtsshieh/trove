import { execSync } from 'node:child_process';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

// Bathroom bulk scan-to-fill. As with the wardrobe bulk-add spec we never exercise
// the real LLM scan or MinIO: /api/upload and /api/remove-background are stubbed so
// the pipeline is deterministic, the scan gracefully yields empty drafts (no live
// model), and we drive the draft-row UI + the real createBathroomProduct loop by
// hand. Each test starts from the clean seeded baseline so it's order-independent.
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

// Stub the two binary endpoints the bulk pipeline calls so no MinIO/model is hit.
async function stubPipeline(page: Page): Promise<void> {
	let n = 0;
	await page.route('**/api/upload', async (route) => {
		n += 1;
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ key: `e2e/bulk-bath-${n}.webp` }),
		});
	});
	await page.route('**/api/remove-background', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'image/png',
			body: PNG,
		});
	});
}

async function gotoBathroom(page: Page): Promise<void> {
	await page.goto('/bathroom/catalog');
	await page.waitForLoadState('networkidle').catch(() => {});
}

async function openBulk(page: Page) {
	await page.getByTestId('bulk-add-trigger').click();
	const dialog = page.getByTestId('bulk-add-dialog');
	await expect(dialog).toBeVisible();
	return dialog;
}

test('bathroom bulk add — continue → run bg + scan → fill rows → create persists every product', async ({
	page,
}) => {
	await stubPipeline(page);
	await gotoBathroom(page);
	const dialog = await openBulk(page);

	await dialog.getByTestId('bulk-file-input').setInputFiles([shirt, pants]);
	await expect(dialog.getByTestId('bulk-tile')).toHaveCount(2);

	// Continue to the process stage, where the rows render.
	await dialog.getByTestId('bulk-continue').click();
	const rows = dialog.getByTestId('bulk-draft-row');
	await expect(rows).toHaveCount(2);

	// Both checkboxes default on, so "Run on all" kicks off background removal +
	// scan together. The ops are independent: each row reaches data-bg=done and a
	// terminal data-scan (no live model → an empty draft to fill in).
	await dialog.getByTestId('bulk-run').click();
	for (const row of await rows.all()) {
		await expect(row).toHaveAttribute('data-bg', 'done', { timeout: 15000 });
		await expect(row).toHaveAttribute('data-scan', /done|error/, {
			timeout: 15000,
		});
	}

	// Pick a nature on each row (base-ui Select options render in a page-level
	// portal; center them before clicking so a scroll arrow can't intercept).
	const pickOption = async (name: string) => {
		const option = page.getByRole('option', { name, exact: true });
		await option.waitFor();
		await option.evaluate((el) =>
			el.scrollIntoView({ block: 'center', behavior: 'instant' }),
		);
		await option.click();
	};

	// Row 0 — a consumable: name + nature, which then reveals the Form select.
	const row0 = rows.nth(0);
	await row0.getByTestId('bulk-name').fill('E2E Body Wash');
	await row0.getByTestId('bulk-nature').click();
	await pickOption('Consumable');
	await expect(row0.getByTestId('bulk-form')).toBeVisible();

	// Row 1 — an appliance: name + nature only (no Form field for non-consumables).
	const row1 = rows.nth(1);
	await row1.getByTestId('bulk-name').fill('E2E Hair Dryer');
	await row1.getByTestId('bulk-nature').click();
	await pickOption('Appliance');
	await expect(row1.getByTestId('bulk-form')).toHaveCount(0);

	await dialog.getByTestId('bulk-create-all').click();
	await expect(dialog).not.toBeVisible({ timeout: 15000 });

	// Both products now live in the catalog and survive a reload.
	await page.reload();
	await page.waitForLoadState('networkidle').catch(() => {});

	await expect(
		page
			.getByTestId('bathroom-product-card')
			.filter({ hasText: 'E2E Body Wash' })
			.first(),
	).toBeVisible();
	await expect(
		page
			.getByTestId('bathroom-product-card')
			.filter({ hasText: 'E2E Hair Dryer' })
			.first(),
	).toBeVisible();
});
