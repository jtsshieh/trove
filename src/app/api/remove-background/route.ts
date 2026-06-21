import { NextResponse, type NextRequest } from 'next/server';

import { getCurrentUser } from '@/app/dashboard/(main)/account/_data/fetchers';
import { removeBackground } from '@/lib/background-removal.server';

// CPU inference can take a while, especially on the first (cold) request.
export const maxDuration = 120;

export async function POST(request: NextRequest) {
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File)) {
		return NextResponse.json({ error: 'No file' }, { status: 400 });
	}

	// Optional keep-mask: roughly painted areas whose whole connected chunks
	// should be restored even if RMBG dropped them.
	const mask = form.get('mask');
	const keepMask =
		mask instanceof File ? Buffer.from(await mask.arrayBuffer()) : undefined;

	try {
		const png = await removeBackground(
			Buffer.from(await file.arrayBuffer()),
			keepMask,
		);
		return new NextResponse(new Uint8Array(png), {
			headers: { 'Content-Type': 'image/png' },
		});
	} catch (error) {
		console.error('background removal failed', error);
		return NextResponse.json(
			{ error: 'Background removal unavailable' },
			{ status: 503 },
		);
	}
}
