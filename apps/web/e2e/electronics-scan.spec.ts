import { execSync } from 'node:child_process';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

// LLM scan-to-fill bulk add for electronics. Like the wardrobe bulk add, we never
// exercise the real LLM scan or MinIO: /api/upload and /api/remove-background are
// stubbed so the pipeline is deterministic, the scan route gracefully yields empty
// drafts (no live model), and we drive the draft-row UI + the real create route by
// hand. Each test starts from the clean seeded baseline so they're order-independent.
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
			body: JSON.stringify({ key: `e2e/elec-${n}.webp` }),
		});
	});
	await page.route('**/api/remove-background', async (route) => {
		await route.fulfill({ status: 200, contentType: 'image/png', body: PNG });
	});
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

test('electronics bulk add — continue → run → fill kind + name → create persists each electronic', async ({
	page,
}) => {
	await stubPipeline(page);
	await page.goto('/electronics');
	await page.waitForLoadState('networkidle').catch(() => {});

	await page.getByTestId('bulk-add-trigger').click();
	const dialog = page.getByTestId('bulk-add-dialog');
	await expect(dialog).toBeVisible();

	await dialog.getByTestId('bulk-file-input').setInputFiles([shirt, pants]);
	await expect(dialog.getByTestId('bulk-tile')).toHaveCount(2);

	// Continue to the process stage, where the rows render.
	await dialog.getByTestId('bulk-continue').click();
	const rows = dialog.getByTestId('bulk-draft-row');
	await expect(rows).toHaveCount(2);

	// Both checkboxes default on, so "Run on all" kicks off background removal + scan
	// together. The ops are independent: each row reaches data-bg=done and a terminal
	// scan state (no live model → done with an empty draft, or a graceful error);
	// either way the row is fillable.
	await dialog.getByTestId('bulk-run').click();
	for (const row of await rows.all()) {
		await expect(row).toHaveAttribute('data-bg', 'done', { timeout: 15000 });
		await expect(row).toHaveAttribute('data-scan', /done|error/, {
			timeout: 15000,
		});
	}

	// Fill the two required fields (name + kind) on each row. Names chosen not to
	// collide with the seeded electronics or the page's description copy.
	const fillRow = async (index: number, name: string, kind: string) => {
		const row = rows.nth(index);
		await row.getByTestId('bulk-name').fill(name);
		await row.getByTestId('bulk-kind').click();
		await pickOption(page, kind);
	};
	await fillRow(0, 'Pixel Buds X1', 'Accessory');
	await fillRow(1, 'Anker Brick X2', 'Power Bank');

	await dialog.getByTestId('bulk-create-all').click();
	await expect(dialog).not.toBeVisible({ timeout: 15000 });

	// Both items now live in the catalog and survive a reload.
	await page.reload();
	await page.waitForLoadState('networkidle').catch(() => {});

	const buds = page
		.getByTestId('electronic-card')
		.filter({ hasText: 'Pixel Buds X1' });
	const brick = page
		.getByTestId('electronic-card')
		.filter({ hasText: 'Anker Brick X2' });
	await expect(buds).toBeVisible();
	await expect(brick).toBeVisible();
});
