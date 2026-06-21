import { execSync } from 'node:child_process';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

// Feature 4 — wardrobe bulk add. We never exercise the real LLM scan or MinIO:
// /api/upload and /api/remove-background are stubbed so the pipeline is
// deterministic, the scan action gracefully yields empty drafts (no live model),
// and we drive the draft-row UI + the real createClothingBatch action by hand.
//
// Each test starts from the clean seeded baseline so they are order-independent.
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
			body: JSON.stringify({ key: `e2e/bulk-${n}.webp` }),
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

async function gotoWardrobe(page: Page): Promise<void> {
	await page.goto('/dashboard/wardrobe');
	await page.waitForLoadState('networkidle').catch(() => {});
}

async function openBulk(page: Page) {
	await page.getByTestId('bulk-add-trigger').click();
	const dialog = page.getByTestId('bulk-add-dialog');
	await expect(dialog).toBeVisible();
	return dialog;
}

test('bulk add — stage 1 is a gallery: list photos, delete, no edit or bg', async ({
	page,
}) => {
	await stubPipeline(page);
	await gotoWardrobe(page);
	const dialog = await openBulk(page);

	await dialog.getByTestId('bulk-file-input').setInputFiles([shirt, pants]);

	const tiles = dialog.getByTestId('bulk-tile');
	await expect(tiles).toHaveCount(2);

	// Stage 1 only shows photos + delete: no per-photo bg toggle or editing.
	await expect(dialog.getByTestId('bulk-removebg-toggle')).toHaveCount(0);
	await expect(dialog.getByTestId('bulk-edit')).toHaveCount(0);

	// Deleting a photo drops only that tile.
	await tiles.first().getByTestId('bulk-tile-remove').click();
	await expect(tiles).toHaveCount(1);
});

test('bulk add — continue → run bg + scan → fill rows → create persists every item', async ({
	page,
}) => {
	await stubPipeline(page);
	await gotoWardrobe(page);
	const dialog = await openBulk(page);

	await dialog.getByTestId('bulk-file-input').setInputFiles([shirt, pants]);
	await expect(dialog.getByTestId('bulk-tile')).toHaveCount(2);

	// Continue to the process stage, where the rows render.
	await dialog.getByTestId('bulk-continue').click();
	const rows = dialog.getByTestId('bulk-draft-row');
	await expect(rows).toHaveCount(2);

	// Both checkboxes default on, so "Run on all" kicks off background removal +
	// scan together. The ops are independent: each row reaches data-bg=done and
	// data-scan=done (no live model → the scan yields an empty draft to fill in).
	await dialog.getByTestId('bulk-run').click();
	for (const row of await rows.all()) {
		await expect(row).toHaveAttribute('data-bg', 'done', { timeout: 15000 });
		// Scan reaches a terminal state. With no live model it yields an empty draft
		// (done) or fails gracefully (error); either way the row is fillable.
		await expect(row).toHaveAttribute('data-scan', /done|error/, {
			timeout: 15000,
		});
	}

	// Fill the two required-and-color fields on each row via the Base UI Selects.
	// Options render in a portal, so pick them at the page level. The Select aligns
	// the active item to the trigger and overlays scroll arrows — an option near the
	// list's edge can sit under the scroll-down arrow, which intercepts the click. So
	// center the option inside the popup before clicking it (pickOption).
	const pickOption = async (name: string) => {
		const option = page.getByRole('option', { name, exact: true });
		await option.waitFor();
		await option.evaluate((el) =>
			el.scrollIntoView({ block: 'center', behavior: 'instant' }),
		);
		await option.click();
	};
	const fillRow = async (
		index: number,
		type: string,
		brand: string,
		color: string,
	) => {
		const row = rows.nth(index);
		await row.getByTestId('bulk-type').click();
		await pickOption(type);
		await row.getByTestId('bulk-brand').click();
		await pickOption(brand);
		await row.getByTestId('bulk-color').click();
		await pickOption(color);
	};

	await fillRow(0, 'Polo', 'Adidas', 'Red');
	await fillRow(1, 'Scarf', 'Patagonia', 'Teal');

	// Set a quantity on the second row to prove draft edits flow into the batch.
	await rows.nth(1).getByTestId('bulk-quantity').fill('3');

	await dialog.getByTestId('bulk-create-all').click();
	await expect(dialog).not.toBeVisible({ timeout: 15000 });

	// Both items now live in the wardrobe and survive a reload.
	await page.reload();
	await page.waitForLoadState('networkidle').catch(() => {});

	const polo = page
		.getByTestId('wardrobe-card')
		.filter({ hasText: 'Red Adidas Polo' });
	const scarf = page
		.getByTestId('wardrobe-card')
		.filter({ hasText: 'Teal Patagonia Scarf' });
	await expect(polo).toBeVisible();
	await expect(scarf).toBeVisible();
	await expect(scarf.getByTestId('quantity-badge')).toHaveText('×3');
});
