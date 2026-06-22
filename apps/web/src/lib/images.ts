/** Same-origin URL for an image stored in object storage, served via /api/images. */
export function imageSrc(key: string): string {
	return `/api/images/${key.split('/').map(encodeURIComponent).join('/')}`;
}
