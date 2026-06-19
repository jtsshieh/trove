import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE ?? 'http://localhost:3000';
const CDP = process.env.E2E_CDP ?? 'http://localhost:9222';
const SUFFIX = String(Date.now()).slice(-6);

const results = [];
const ok = (n) => {
	results.push({ name: n, ok: true });
	console.log(`  PASS  ${n}`);
};
const fail = (n, e) => {
	results.push({
		name: n,
		ok: false,
		err: String(e?.message ?? e).split('\n')[0],
	});
	console.log(`  FAIL  ${n}: ${String(e?.message ?? e).split('\n')[0]}`);
};

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0] ?? (await browser.newContext());
// Close stale pages from previous runs and clear the auth cookie so the
// login flow is exercised from scratch (the persistent profile keeps cookies).
for (const p of context.pages()) await p.close().catch(() => {});
await context.clearCookies().catch(() => {});
const page = await context.newPage();
await page.setViewportSize({ width: 1366, height: 900 });
page.setDefaultTimeout(20000);

const shot = (t) =>
	page.screenshot({ path: `e2e/shot-${t}.png` }).catch(() => {});
const settle = async () => {
	// let Base UI dialog close-animation + inert/focus-trap clear, and let the
	// post-mutation router refresh + TanStack refetch settle.
	await page.waitForLoadState('networkidle').catch(() => {});
	await page.waitForTimeout(450);
};

const cardByText = (text) =>
	page.locator('[data-slot="card"]').filter({ hasText: text }).first();
const dialogTitled = (title) =>
	page.getByRole('dialog').filter({ hasText: title });

async function pickSelectIn(scope, placeholder, option) {
	await scope.getByText(placeholder).click();
	await page.getByRole('option', { name: option, exact: true }).first().click();
}

async function expectVisible(text) {
	await page
		.getByText(text, { exact: false })
		.first()
		.waitFor({ state: 'visible', timeout: 20000 });
}
async function expectGone(text) {
	await page
		.locator(`text="${text}"`)
		.first()
		.waitFor({ state: 'detached', timeout: 20000 })
		.catch(async () => {
			const c = await page.getByText(text, { exact: true }).count();
			if (c !== 0) throw new Error(`"${text}" still present (count ${c})`);
		});
}

async function login() {
	await page.goto(`${BASE}/sign-in`, { waitUntil: 'networkidle' });
	await page.getByLabel('Username').fill('jtsshieh');
	await page.getByRole('button', { name: 'Continue' }).click();
	await page.getByLabel('Password').waitFor({ state: 'visible' });
	await page.getByLabel('Password').fill('jtsshieh');
	await page.getByRole('button', { name: 'Continue' }).click();
	await page.waitForURL('**/dashboard', { timeout: 25000 });
	ok('login (password) -> /dashboard');
}

async function createSimple({
	url,
	addName,
	placeholder,
	value,
	submitName,
	select,
}) {
	await page.goto(url, { waitUntil: 'networkidle' });
	await page.getByRole('button', { name: addName }).click();
	const d = page.getByRole('dialog');
	await d.waitFor({ state: 'visible' });
	if (select) {
		await d.getByText(select.placeholder).click();
		await page.getByRole('option', { name: select.option }).click();
	}
	await d.getByPlaceholder(placeholder).fill(value);
	await d.getByRole('button', { name: submitName }).click();
	await d.waitFor({ state: 'hidden' });
	await settle();
	await expectVisible(value);
}

async function editSimple({
	name,
	placeholder,
	newValue,
	submitName,
	editTitle,
}) {
	const card = cardByText(name);
	await card
		.locator('[data-slot="dialog-trigger"]:not(.text-destructive)')
		.first()
		.click();
	const d = dialogTitled(editTitle);
	await d.waitFor({ state: 'visible' });
	await d.getByPlaceholder(placeholder).fill(newValue);
	await d.getByRole('button', { name: submitName }).click();
	await d.waitFor({ state: 'hidden' });
	await settle();
	await expectVisible(newValue);
}

async function deleteByName({ name, deleteTitle }) {
	const card = cardByText(name);
	await card
		.locator('[data-slot="dialog-trigger"].text-destructive')
		.first()
		.click();
	const d = dialogTitled(deleteTitle);
	await d.waitFor({ state: 'visible' });
	await d.locator('button[type="submit"]').click();
	await d.waitFor({ state: 'hidden' });
	await settle();
	await expectGone(name);
}

async function entity(label, opts) {
	const name = opts.value;
	try {
		await createSimple(opts);
		ok(`${label}: create`);
	} catch (e) {
		await shot(`${label}-create`);
		return fail(`${label}: create`, e);
	}
	if (opts.edit) {
		try {
			await editSimple({ name, ...opts.edit });
			ok(`${label}: edit`);
		} catch (e) {
			await shot(`${label}-edit`);
			fail(`${label}: edit`, e);
		}
	}
	try {
		const finalName = opts.edit ? opts.edit.newValue : name;
		await deleteByName({ name: finalName, deleteTitle: opts.deleteTitle });
		ok(`${label}: delete`);
	} catch (e) {
		await shot(`${label}-delete`);
		fail(`${label}: delete`, e);
	}
}

try {
	await login();

	await entity('luggage', {
		url: `${BASE}/dashboard/packing-gear/luggage`,
		addName: 'Add Luggage',
		placeholder: 'Enter a name for this piece of luggage',
		value: `E2E Luggage ${SUFFIX}`,
		submitName: 'Add Luggage',
		edit: {
			placeholder: 'Enter a name for this piece of luggage',
			newValue: `E2E Luggage ${SUFFIX} edited`,
			submitName: 'Edit Luggage',
			editTitle: 'Edit Luggage',
		},
		deleteTitle: 'Delete Luggage',
	});

	await entity('container', {
		url: `${BASE}/dashboard/packing-gear/containers`,
		addName: 'Add Container',
		placeholder: 'Enter a name for this container',
		value: `E2E Container ${SUFFIX}`,
		submitName: 'Add Container',
		select: {
			placeholder: 'Select the type of items that will go into this container',
			option: 'Clothes',
		},
		edit: {
			placeholder: 'Enter a name for this container',
			newValue: `E2E Container ${SUFFIX} edited`,
			submitName: 'Edit Container',
			editTitle: 'Edit Container',
		},
		deleteTitle: 'Delete Container',
	});

	await entity('essential', {
		url: `${BASE}/dashboard/essentials`,
		addName: 'Add Essential',
		placeholder: 'Enter a name for this essential',
		value: `E2E Essential ${SUFFIX}`,
		submitName: 'Save changes',
		select: { placeholder: 'Select the type of essential', option: 'Toiletry' },
		edit: {
			placeholder: 'Enter a name for this essential',
			newValue: `E2E Essential ${SUFFIX} edited`,
			submitName: 'Save changes',
			editTitle: 'Edit essential',
		},
		deleteTitle: 'Delete essential',
	});
} catch (e) {
	console.log('FATAL', e);
	await shot('fatal');
}

// ---- BRAND (create trigger is an icon button in the header; edit is a text button) ----
async function brandCrud() {
	const name = `E2EBrand${SUFFIX}`;
	const edited = `${name}edited`;
	await page.goto(`${BASE}/dashboard/wardrobe/brands`, {
		waitUntil: 'networkidle',
	});
	try {
		// open Create brand dialog (icon button in header). Click candidate header
		// buttons until the "Create brand" dialog appears.
		let opened = false;
		const candidates = await page.locator('button').all();
		for (const b of candidates) {
			await b.click({ timeout: 1500 }).catch(() => {});
			const d = dialogTitled('Create brand');
			if (await d.isVisible().catch(() => false)) {
				opened = true;
				break;
			}
			await page.keyboard.press('Escape').catch(() => {});
		}
		if (!opened) throw new Error('could not open Create brand dialog');
		const d = dialogTitled('Create brand');
		await d.getByPlaceholder('Enter a name for this brand').fill(name);
		await d.getByRole('button', { name: 'Save changes' }).click();
		await d.waitFor({ state: 'hidden' });
		await settle();
		await expectVisible(name);
		ok('brand: create');
	} catch (e) {
		await shot('brand-create');
		return fail('brand: create', e);
	}
	try {
		const card = cardByText(name);
		await card.getByRole('button', { name: 'Edit', exact: true }).click();
		const d = dialogTitled('Edit brand');
		await d.waitFor({ state: 'visible' });
		await d.getByPlaceholder('Enter a name for this brand').fill(edited);
		await d.getByRole('button', { name: 'Save changes' }).click();
		await d.waitFor({ state: 'hidden' });
		await settle();
		await expectVisible(edited);
		ok('brand: edit');
	} catch (e) {
		await shot('brand-edit');
		fail('brand: edit', e);
	}
	try {
		await deleteByName({ name: edited, deleteTitle: 'Delete brand' });
		ok('brand: delete');
	} catch (e) {
		await shot('brand-delete');
		fail('brand: delete', e);
	}
}
try {
	await brandCrud();
} catch (e) {
	fail('brand', e);
}

// ---- CLOTHING (3 selects: type/brand/color + unique modifier) ----
async function clothingCrud() {
	const tag = `E2E${SUFFIX}`;
	const editedTag = `${tag}edited`;
	const mod = 'Enter an optional modifier for this item of clothing';
	await page.goto(`${BASE}/dashboard/wardrobe`, { waitUntil: 'networkidle' });
	try {
		await page.getByRole('button', { name: 'Add Clothing' }).click();
		const d = dialogTitled('Create clothing');
		await d.waitFor({ state: 'visible' });
		await pickSelectIn(d, 'Select the type of clothing', 'Hoodie');
		await pickSelectIn(d, 'Select the brand of clothing', 'Uniqlo');
		await pickSelectIn(d, 'Select the color of clothing', 'Black');
		await d.getByPlaceholder(mod).fill(tag);
		await d.getByRole('button', { name: 'Save changes' }).click();
		await d.waitFor({ state: 'hidden' });
		await settle();
		await expectVisible(tag);
		ok('clothing: create (3 selects)');
	} catch (e) {
		await shot('clothing-create');
		return fail('clothing: create', e);
	}
	try {
		const card = cardByText(tag);
		await card
			.locator('[data-slot="dialog-trigger"]:not(.text-destructive)')
			.first()
			.click();
		const d = dialogTitled('Edit clothing');
		await d.waitFor({ state: 'visible' });
		await d.getByPlaceholder(mod).fill(editedTag);
		await d.getByRole('button', { name: 'Save changes' }).click();
		await d.waitFor({ state: 'hidden' });
		await settle();
		await expectVisible(editedTag);
		ok('clothing: edit');
	} catch (e) {
		await shot('clothing-edit');
		fail('clothing: edit', e);
	}
	try {
		await deleteByName({ name: editedTag, deleteTitle: 'Delete clothing' });
		ok('clothing: delete');
	} catch (e) {
		await shot('clothing-delete');
		fail('clothing: delete', e);
	}
}
try {
	await clothingCrud();
} catch (e) {
	fail('clothing', e);
}

// ---- TRIP (date-range Calendar in a Popover; delete via the manage page) ----
async function tripCrud() {
	const name = `E2E Trip ${SUFFIX}`;
	await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
	try {
		await page.getByRole('button', { name: 'Create Trip' }).click();
		const d = dialogTitled('Create Trip');
		await d.waitFor({ state: 'visible' });
		await d.getByPlaceholder('Give your trip a nice title').fill(name);
		await d.getByText('Select the dates of your trip').click();
		// react-day-picker range: pick a start day, then an end day. The popover
		// may auto-close once a (possibly single-day) range is set, so the second
		// click is best-effort.
		await page
			.locator('button[data-day]')
			.filter({ hasText: /^10$/ })
			.first()
			.click();
		await page
			.locator('button[data-day]')
			.filter({ hasText: /^20$/ })
			.first()
			.click({ timeout: 4000 })
			.catch(() => {});
		// confirm a date range is set on the trigger, then submit
		await d
			.getByText(/\w{3} \d{1,2}, \d{4}/)
			.first()
			.waitFor({ state: 'visible' });
		await d.getByRole('button', { name: 'Save changes' }).click();
		await d.waitFor({ state: 'hidden' });
		await settle();
		await expectVisible(name);
		ok('trip: create (with Calendar)');
	} catch (e) {
		await shot('trip-create');
		return fail('trip: create', e);
	}
	try {
		// reload the trips list for a clean, settled DOM (avoids the post-create
		// TanStack refetch race)
		await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
		// the "Open" control is an <a href> that Base UI exposes as role=button
		const openLink = cardByText(name).getByRole('button', { name: 'Open' });
		await openLink.waitFor({ state: 'visible', timeout: 20000 });
		const href = await openLink.getAttribute('href');
		const tripId = href.split('/').filter(Boolean).pop();
		await page.goto(`${BASE}/dashboard/${tripId}/manage`, {
			waitUntil: 'domcontentloaded',
		});
		const del = page.getByRole('button', { name: 'Delete Trip' });
		await del.waitFor({ state: 'visible', timeout: 20000 });
		await del.click();
		const dd = dialogTitled('Delete trip');
		await dd.waitFor({ state: 'visible' });
		await dd.locator('button[type="submit"]').click();
		await page.waitForURL((url) => new URL(url).pathname === '/dashboard', {
			timeout: 20000,
		});
		await settle();
		await expectGone(name);
		ok('trip: delete');
	} catch (e) {
		await shot('trip-delete');
		fail('trip: delete', e);
	}
}
try {
	await tripCrud();
} catch (e) {
	fail('trip', e);
}

// ---- TRIP-VIEWER PROVISIONS (essential/luggage/container/clothing) ----
async function makeTrip(name) {
	await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
	await page.getByRole('button', { name: 'Create Trip' }).click();
	const d = dialogTitled('Create Trip');
	await d.waitFor({ state: 'visible' });
	await d.getByPlaceholder('Give your trip a nice title').fill(name);
	await d.getByText('Select the dates of your trip').click();
	await page
		.locator('button[data-day]')
		.filter({ hasText: /^10$/ })
		.first()
		.click();
	await page
		.locator('button[data-day]')
		.filter({ hasText: /^20$/ })
		.first()
		.click({ timeout: 4000 })
		.catch(() => {});
	await d
		.getByText(/\w{3} \d{1,2}, \d{4}/)
		.first()
		.waitFor({ state: 'visible' });
	await d.getByRole('button', { name: 'Save changes' }).click();
	await d.waitFor({ state: 'hidden' });
	await settle();
	await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
	const openLink = cardByText(name).getByRole('button', { name: 'Open' });
	await openLink.waitFor({ state: 'visible', timeout: 20000 });
	const href = await openLink.getAttribute('href');
	return href.split('/').filter(Boolean).pop();
}

async function addComboProvision({ tab, addBtn, dialogTitle, option, submit }) {
	await page.goto(`${BASE}/dashboard/${PROV_TRIP}/${tab}`, {
		waitUntil: 'domcontentloaded',
	});
	await page.getByRole('button', { name: addBtn }).first().click();
	const d = dialogTitled(dialogTitle);
	await d.waitFor({ state: 'visible' });
	await d.getByRole('combobox').first().click();
	await page.getByRole('option', { name: option }).first().click();
	await d.getByRole('button', { name: submit }).click();
	await d.waitFor({ state: 'hidden' });
	await settle();
	await expectVisible(option);
}

let PROV_TRIP;
async function provisionsCrud() {
	const tripName = `E2E PTrip ${SUFFIX}`;
	try {
		PROV_TRIP = await makeTrip(tripName);
		ok('provisions: trip setup');
	} catch (e) {
		await shot('prov-setup');
		return fail('provisions: trip setup', e);
	}

	try {
		await addComboProvision({
			tab: 'essentials',
			addBtn: 'Add Provision',
			dialogTitle: 'Add Essential Provision',
			option: 'Seed Toothbrush',
			submit: 'Add Provision',
		});
		ok('provision: essential (add)');
	} catch (e) {
		await shot('prov-essential');
		fail('provision: essential', e);
	}

	try {
		await addComboProvision({
			tab: 'luggage',
			addBtn: 'Add Luggage',
			dialogTitle: 'Add Luggage Provision',
			option: 'Seed Carry-on',
			submit: 'Add Luggage',
		});
		ok('provision: luggage (add)');
	} catch (e) {
		await shot('prov-luggage');
		fail('provision: luggage', e);
	}

	try {
		await addComboProvision({
			tab: 'containers',
			addBtn: 'Add Container',
			dialogTitle: 'Add Container Provision',
			option: 'Seed Toiletry Pouch',
			submit: 'Add Container',
		});
		ok('provision: container (add)');
	} catch (e) {
		await shot('prov-container');
		fail('provision: container', e);
	}

	try {
		await page.goto(`${BASE}/dashboard/${PROV_TRIP}/clothing`, {
			waitUntil: 'domcontentloaded',
		});
		await page.getByRole('button', { name: 'Add Provision' }).first().click();
		const d = dialogTitled('Add Clothing Provision');
		await d.waitFor({ state: 'visible' });
		// Day calendar (only trip days enabled); selecting auto-opens the combobox
		await d.getByText('Pick a date').click();
		await page
			.locator('button[data-day]:not([disabled])')
			.filter({ hasText: /^10$/ })
			.first()
			.click();
		await page
			.getByRole('option', { name: 'Black Uniqlo Hoodie' })
			.first()
			.click();
		await d.getByRole('button', { name: 'Add Provision' }).click();
		await d.waitFor({ state: 'hidden' });
		await settle();
		await expectVisible('Black Uniqlo Hoodie');
		ok('provision: clothing (add, day+combobox)');
	} catch (e) {
		await shot('prov-clothing');
		fail('provision: clothing', e);
	}

	// delete one provision explicitly (essential), then cascade-delete the trip
	try {
		await page.goto(`${BASE}/dashboard/${PROV_TRIP}/essentials`, {
			waitUntil: 'domcontentloaded',
		});
		const row = page
			.locator('div')
			.filter({ hasText: 'Seed Toothbrush' })
			.last();
		await row.getByRole('button').last().click();
		await settle();
		await expectGone('Seed Toothbrush');
		ok('provision: essential (delete)');
	} catch (e) {
		await shot('prov-essential-del');
		fail('provision: essential delete', e);
	}

	try {
		await page.goto(`${BASE}/dashboard/${PROV_TRIP}/manage`, {
			waitUntil: 'domcontentloaded',
		});
		const del = page.getByRole('button', { name: 'Delete Trip' });
		await del.waitFor({ state: 'visible', timeout: 20000 });
		await del.click();
		const dd = dialogTitled('Delete trip');
		await dd.waitFor({ state: 'visible' });
		await dd.locator('button[type="submit"]').click();
		await page.waitForURL((url) => new URL(url).pathname === '/dashboard', {
			timeout: 20000,
		});
		ok('provisions: trip cascade-delete');
	} catch (e) {
		await shot('prov-cleanup');
		fail('provisions: cleanup', e);
	}
}
try {
	await provisionsCrud();
} catch (e) {
	fail('provisions', e);
}

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok);
console.log(`\n===== E2E RESULTS: ${passed}/${results.length} passed =====`);
for (const f of failed) console.log(`  FAILED -> ${f.name}: ${f.err}`);

await page.close();
await browser.close();
process.exit(failed.length === 0 ? 0 : 1);
