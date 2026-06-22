import { mkdirSync } from 'node:fs';

import { test as setup } from '@playwright/test';

const authFile = 'e2e/.auth/user.json';

/** Log in as the seeded dev user (jtsshieh/jtsshieh) and save the session. */
setup('authenticate', async ({ page }) => {
	await page.goto('/sign-in');

	// Step 1 — username.
	await page.getByRole('textbox').first().fill('jtsshieh');
	await page.getByRole('button', { name: 'Continue' }).click();

	// Step 2 — password.
	const password = page.locator('input[type="password"]');
	await password.waitFor({ state: 'visible' });
	await password.fill('jtsshieh');
	await page.getByRole('button', { name: 'Continue' }).click();

	await page.waitForURL((url) => new URL(url).pathname === '/', {
		timeout: 15_000,
	});

	mkdirSync('e2e/.auth', { recursive: true });
	await page.context().storageState({ path: authFile });
});
