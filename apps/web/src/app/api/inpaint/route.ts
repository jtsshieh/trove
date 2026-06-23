import { NextResponse, type NextRequest } from 'next/server';

import { getCurrentUser } from '@/app/(app)/account/_data/fetchers';
import { runInpaint } from '@/lib/image-pool.server';

// CPU inference can take a while, especially on the first (cold) request that also
// downloads the model. Inference runs on a worker thread (see image-pool.server)
// so the main thread keeps serving pages while it grinds.
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
		const png = await runInpaint(
			new Uint8Array(await file.arrayBuffer()),
			new Uint8Array(await mask.arrayBuffer()),
		);
		return new NextResponse(new Uint8Array(png), {
			headers: { 'Content-Type': 'image/png' },
		});
	} catch (error) {
		// Covers worker failures and pool backpressure (queue at limit).
		console.error('inpaint failed', error);
		return NextResponse.json({ error: 'Inpainting unavailable' }, { status: 503 });
	}
}
