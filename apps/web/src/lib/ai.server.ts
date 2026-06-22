import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/**
 * LLM scan-to-fill via the Claude Agent SDK, billed to the user's Claude.ai
 * subscription (CLAUDE_CODE_OAUTH_TOKEN). Single-shot: the agent reads one image
 * file and returns a JSON object of suggested fields. Best-effort — returns null
 * on any failure so the form simply isn't pre-filled.
 */
export interface ClothingTaxonomy {
	types: { name: string; category: string }[];
	brands: string[];
	colors: string[];
}

export async function scanClothing(
	imageBytes: Uint8Array,
	ext: string,
	taxonomy: ClothingTaxonomy,
): Promise<Record<string, unknown> | null> {
	const instructions = `You are identifying a single clothing item from a photo.
Existing clothing types (name — category): ${taxonomy.types
		.map((t) => `${t.name} (${t.category})`)
		.join(', ')}.
Existing brands: ${taxonomy.brands.join(', ')}.
Allowed colors: ${taxonomy.colors.join(', ')}.
Prefer the closest existing type/brand/color. If the brand or type is clearly new you may propose a new value; for a new type include its category as Top, Bottom, or Accessory.
When the photo shows a visible sub-line / collection / model name for the brand (e.g. Nike "Dri-FIT", Uniqlo "U", Levi's "501", Adidas "Originals"), set "brandLine" to it — infer it from logos, tags, or distinctive design when you reasonably can; omit it only if there is no sensible guess.
The item's name is composed from color + brand + type, so if that combination would be too generic to tell this piece apart from another (e.g. just "White Uniqlo T-Shirt"), set "modifier" to one or two short distinguishing words drawn from the item's most salient feature — a graphic, print, or pattern motif ("pineapple", "flower", "striped"), or a notable detail. Keep it concise (no full sentences) and omit it when color + brand + type already describes the piece unambiguously.
Respond with ONLY a JSON object: {"type": string, "typeCategory"?: "Top"|"Bottom"|"Accessory", "brand": string, "color": string, "brandLine"?: string, "modifier"?: string}.`;
	return runScan(imageBytes, ext, instructions);
}

export async function scanEssential(
	imageBytes: Uint8Array,
	ext: string,
	categories: string[],
): Promise<Record<string, unknown> | null> {
	const instructions = `Identify a single travel essential (a toiletry, document, or electronic) from a photo.
For "name", read the logos and label text and produce a SPECIFIC product name that includes the brand and product line whenever they are legible — e.g. "OGX Argan Oil Conditioner", "Clear Care Plus Contact Solution", "Anker 20W USB-C Charger", "Colgate Total Toothpaste" — NOT a generic word like "Conditioner", "Solution", or "Charger". Keep it concise: brand + line + product type, with no sizes, volumes, or marketing copy. If no brand is legible, give the most specific descriptive name you can.
Allowed categories: ${categories.join(', ')}.
Respond with ONLY a JSON object: {"name": string, "category": one of the allowed categories}.`;
	return runScan(imageBytes, ext, instructions);
}

export async function scanContainer(
	imageBytes: Uint8Array,
	ext: string,
	types: string[],
): Promise<Record<string, unknown> | null> {
	const instructions = `Identify a single packing CONTAINER from a photo — a packing cube, toiletry bag, pouch, cosmetics case, shoe bag, or similar. These go INSIDE luggage.
For "name", produce a short descriptive name (e.g. "Blue packing cube", "Toiletry bag").
Also guess which kind of items it most likely holds, choosing from the allowed types (${types.join(', ')}): a toiletry/cosmetics/wash bag holds Essentials; a packing cube / clothes pouch holds Clothes.
Respond with ONLY a JSON object: {"name": string, "type": one of the allowed types}.`;
	return runScan(imageBytes, ext, instructions);
}

export async function scanLuggage(
	imageBytes: Uint8Array,
	ext: string,
): Promise<Record<string, unknown> | null> {
	const instructions = `Identify a single piece of LUGGAGE from a photo — a suitcase, carry-on, backpack, duffel, or garment bag.
For "name", produce a short descriptive name (e.g. "Black hardshell carry-on", "Patagonia backpack") — include the brand if a logo is legible.
Respond with ONLY a JSON object: {"name": string}.`;
	return runScan(imageBytes, ext, instructions);
}

async function runScan(
	imageBytes: Uint8Array,
	ext: string,
	instructions: string,
): Promise<Record<string, unknown> | null> {
	let dir: string | undefined;
	try {
		// Loosely typed: the Agent SDK surface is exercised at runtime, not built.
		const sdk: any = await import('@anthropic-ai/claude-agent-sdk');
		dir = await mkdtemp(path.join(tmpdir(), 'scan-'));
		const file = path.join(dir, `image.${ext.replace(/[^a-z0-9]/gi, '') || 'jpg'}`);
		await writeFile(file, imageBytes);

		let text = '';
		for await (const message of sdk.query({
			prompt: `Read the image at ${file}. ${instructions}`,
			options: {
				model: process.env.AI_MODEL,
				maxTurns: 4,
				allowedTools: ['Read'],
				permissionMode: 'bypassPermissions',
			},
		})) {
			if (
				message?.type === 'result' &&
				typeof message.result === 'string'
			) {
				text = message.result;
			}
		}
		return extractJson(text);
	} catch (error) {
		console.error('scan failed', error);
		return null;
	} finally {
		if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {});
	}
}

function extractJson(text: string): Record<string, unknown> | null {
	const match = text.match(/\{[\s\S]*\}/);
	if (!match) return null;
	try {
		return JSON.parse(match[0]) as Record<string, unknown>;
	} catch {
		return null;
	}
}
