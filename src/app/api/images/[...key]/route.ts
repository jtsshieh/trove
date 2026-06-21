import { NextResponse, type NextRequest } from 'next/server';

import { getCurrentUser } from '@/app/dashboard/(main)/account/_data/fetchers';
import { getObject, keyOwner } from '@/lib/storage.server';

/** Streams a stored image, but only to the user who owns it (owner is in the key). */
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ key: string[] }> },
) {
	const user = await getCurrentUser();
	if (!user) return new NextResponse('Unauthorized', { status: 401 });

	const { key: segments } = await params;
	const key = segments.map(decodeURIComponent).join('/');
	if (keyOwner(key) !== user.id) {
		return new NextResponse('Forbidden', { status: 403 });
	}

	try {
		const { body, contentType } = await getObject(key);
		return new NextResponse(Buffer.from(body), {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'private, max-age=3600',
			},
		});
	} catch {
		return new NextResponse('Not found', { status: 404 });
	}
}
