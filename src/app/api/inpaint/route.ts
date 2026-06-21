import { NextResponse, type NextRequest } from 'next/server';

import { getCurrentUser } from '@/app/dashboard/(main)/account/_data/fetchers';
import { inpaint } from '@/lib/inpaint.server';

// CPU inference can take a while, especially on the first (cold) request that also
// downloads the model.
export const maxDuration = 120;

/**
 * Erases the masked region of an image and reconstructs the pixels underneath
 * (LaMa). `file` is the photo; `mask` is a 1-channel image where white = erase.
 * Used to remove the clamp hanger and rebuild the covered waistband. Returns an
 * opaque PNG — callers can then run background removal on it.
 */
export async function POST(request: NextRequest) {
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const form = await request.formData();
	const file = form.get('file');
	const mask = form.get('mask');
	if (!(file instanceof File) || !(mask instanceof File)) {
		return NextResponse.json({ error: 'Missing file or mask' }, { status: 400 });
	}

	try {
		const png = await inpaint(
			Buffer.from(await file.arrayBuffer()),
			Buffer.from(await mask.arrayBuffer()),
		);
		return new NextResponse(new Uint8Array(png), {
			headers: { 'Content-Type': 'image/png' },
		});
	} catch (error) {
		console.error('inpaint failed', error);
		return NextResponse.json({ error: 'Inpainting unavailable' }, { status: 503 });
	}
}
