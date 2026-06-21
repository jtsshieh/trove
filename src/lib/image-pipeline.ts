/**
 * Client-side helpers for the image pipeline shared by the single-item
 * <ImageUpload> field and the wardrobe bulk-add flow. Each call hits the existing
 * /api/upload (stores a downscaled webp, returns `{ key }`) and
 * /api/remove-background (BRIA RMBG, returns a PNG cutout) routes.
 */

/** Uploads a file and returns the stored object key. Throws on failure. */
export async function uploadImageFile(file: File): Promise<string> {
	const form = new FormData();
	form.append('file', file);
	const res = await fetch('/api/upload', { method: 'POST', body: form });
	if (!res.ok) throw new Error('upload failed');
	const { key } = (await res.json()) as { key: string };
	return key;
}

/**
 * Runs background removal and returns a fresh PNG cutout File (not yet uploaded —
 * the caller decides when to persist it). Throws if the service is unavailable.
 * Pass `keepMask` (white-on-black, white = keep) to restore the whole connected
 * chunks the strokes touch — for areas RMBG wrongly removed.
 */
export async function removeImageBackground(
	file: File,
	keepMask?: Blob,
): Promise<File> {
	const form = new FormData();
	form.append('file', file);
	if (keepMask) form.append('mask', keepMask, 'keep.png');
	const res = await fetch('/api/remove-background', {
		method: 'POST',
		body: form,
	});
	if (!res.ok) throw new Error('removal failed');
	const blob = await res.blob();
	return new File([blob], 'cutout.png', { type: 'image/png' });
}

/**
 * Erases the painted region (the clamp hanger) and reconstructs the pixels
 * underneath (LaMa), returning a fresh opaque PNG File. `mask` is a 1-channel
 * image where white = erase. The caller decides when to persist; the returned
 * photo still has its background, so background removal can run on it next.
 */
export async function inpaintImage(file: File, mask: Blob): Promise<File> {
	const form = new FormData();
	form.append('file', file);
	form.append('mask', mask, 'mask.png');
	const res = await fetch('/api/inpaint', { method: 'POST', body: form });
	if (!res.ok) throw new Error('inpaint failed');
	const blob = await res.blob();
	return new File([blob], 'erased.png', { type: 'image/png' });
}
