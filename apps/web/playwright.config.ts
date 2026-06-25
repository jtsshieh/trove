import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	// Shared dev DB — keep tests serial and deterministic.
	fullyParallel: false,
	workers: 1,
	// One retry: the suite is serial on a shared DB and a few drag/Select
	// interactions occasionally flake on dropdown-scroll/pointer timing.
	retries: 1,
	reporter: 'list',
	globalSetup: './e2e/global-setup.ts',
	use: {
		baseURL: 'http://localhost:3000',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
	},
	projects: [
		{ name: 'setup', testMatch: /auth\.setup\.ts/ },
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				storageState: 'e2e/.auth/user.json',
			},
			dependencies: ['setup'],
		},
	],
	webServer: {
		command: 'npm run dev',
		url: 'http://localhost:3000/sign-in',
		reuseExistingServer: true,
		timeout: 180_000,
	},
});
