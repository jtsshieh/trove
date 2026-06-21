import { NextResponse, type NextRequest } from 'next/server';
import sharp from 'sharp';

import { getCurrentUser } from '@/app/dashboard/(main)/account/_data/fetchers';
import { buildImageKey, putObject } from '@/lib/storage.server';

// Generous cap: a background-removed cutout is a full-res RGBA PNG and can be far
// larger than the original JPEG — we downscale to a 1024px webp below regardless.
const MAX_BYTES = 40 * 1024 * 1024;

/**
 * Stores an uploaded image (downscaled to webp) under a user-scoped key and
 * returns `{ key }`. Persisting the key onto an entity is the caller's create/edit
 * action — so this works for both new and existing items.
 */
export async function POST(request: NextRequest) {
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File)) {
		return NextResponse.json({ error: 'No file' }, { status: 400 });
	}
	if (!file.type.startsWith('image/')) {
		return NextResponse.json({ error: 'Not an image' }, { status: 400 });
	}
	if (file.size > MAX_BYTES) {
		return NextResponse.json({ error: 'Image too large' }, { status: 413 });
	}

	try {
		const input = Buffer.from(await file.arrayBuffer());
		// Background-removed cutouts arrive with an alpha channel — keep them
		// TRANSPARENT (padding included) so they stay flexible for compositing (e.g.
		// the outfit cover). Opaque photos get a white square so tiles read cleanly.
		// Either way we `fit: 'contain'` into a 1024² square — pad, never crop.
		const hasAlpha = (await sharp(input).metadata()).hasAlpha ?? false;
		let pipeline = sharp(input, { failOn: 'none' })
			.rotate()
			.resize(1024, 1024, {
				fit: 'contain',
				background: hasAlpha
					? { r: 0, g: 0, b: 0, alpha: 0 }
					: { r: 255, g: 255, b: 255, alpha: 1 },
				withoutEnlargement: true,
			});
		if (!hasAlpha) pipeline = pipeline.flatten({ background: '#ffffff' });
		const webp = await pipeline.webp({ quality: 82 }).toBuffer();

		const key = buildImageKey(user.id, 'webp');
		await putObject(key, webp, 'image/webp');

		return NextResponse.json({ key });
	} catch (error) {
		console.error('image upload failed', error);
		return NextResponse.json(
			{ error: 'Could not process image' },
			{ status: 500 },
		);
	}
}
