import type { Locator, Page } from '@playwright/test';

/**
 * Drive a @dnd-kit/react pointer drag. dnd-kit needs real intermediate pointer
 * movement (a single move won't trigger a sort), so we step from source to target.
 *
 * The boards are CONTROLLED: each `onDragOver` re-renders React to keep state in
 * lockstep with dnd-kit, which reflows the layout under the pointer. A drop point
 * computed once therefore goes stale mid-drag. So after stepping into the target we
 * CONVERGE — repeatedly re-measure the target and move to its current centre until
 * it stops shifting — before releasing, so the drop always lands on the live target.
 */
export async function dndDrag(
	page: Page,
	source: Locator,
	target: Locator,
): Promise<void> {
	await source.scrollIntoViewIfNeeded();
	await target.scrollIntoViewIfNeeded();
	const from = await source.boundingBox();
	const to = await target.boundingBox();
	if (!from || !to) throw new Error('dndDrag: source/target not visible');

	const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
	let end = { x: to.x + to.width / 2, y: to.y + to.height / 2 };

	await page.mouse.move(start.x, start.y);
	await page.mouse.down();
	// A small move past the activation threshold starts the drag before the long haul.
	await page.mouse.move(start.x + 4, start.y + 4, { steps: 2 });

	const steps = 10;
	for (let i = 1; i <= steps; i++) {
		await page.mouse.move(
			start.x + ((end.x - start.x) * i) / steps,
			start.y + ((end.y - start.y) * i) / steps,
			{ steps: 2 },
		);
	}

	// Converge on the (reflowing) target centre: re-measure + re-aim until it settles
	// (or we run out of tries), letting each onDragOver re-render land before the next
	// measurement. dnd-kit then has a stable drop target under the pointer.
	let last = { x: NaN, y: NaN };
	for (let i = 0; i < 6; i++) {
		await page.waitForTimeout(60);
		const box = await target.boundingBox().catch(() => null);
		if (!box) break;
		const cx = box.x + box.width / 2;
		const cy = box.y + box.height / 2;
		await page.mouse.move(cx, cy, { steps: 3 });
		end = { x: cx, y: cy };
		if (Math.abs(cx - last.x) < 1 && Math.abs(cy - last.y) < 1) break;
		last = { x: cx, y: cy };
	}

	// Nudge so the final dragover registers this target, then settle + release.
	await page.mouse.move(end.x + 1, end.y);
	await page.mouse.move(end.x, end.y);
	await page.waitForTimeout(120);
	await page.mouse.up();
}
