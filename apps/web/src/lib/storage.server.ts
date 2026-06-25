import { randomUUID } from 'node:crypto';

import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3';

const bucket = process.env.S3_BUCKET ?? 'trove-images';

const s3ClientSingleton = () =>
	new S3Client({
		region: process.env.S3_REGION ?? 'us-east-1',
		endpoint: process.env.S3_ENDPOINT,
		forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
		credentials: {
			accessKeyId: process.env.S3_ACCESS_KEY_ID ?? 'minioadmin',
			secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? 'minioadmin',
		},
	});

const s3 = globalThis.s3Global ?? s3ClientSingleton();
if (process.env.NODE_ENV !== 'production') globalThis.s3Global = s3;

declare const globalThis: {
	s3Global: ReturnType<typeof s3ClientSingleton>;
} & typeof global;

/** Images are stored under `${userId}/<random>.<ext>` so ownership is in the key. */
export function buildImageKey(userId: string, ext: string): string {
	const safeExt = ext.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'webp';
	return `${userId}/${randomUUID()}.${safeExt}`;
}

export function keyOwner(key: string): string {
	return key.split('/')[0] ?? '';
}

export async function putObject(
	key: string,
	body: Buffer | Uint8Array,
	contentType: string,
) {
	await s3.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: key,
			Body: body,
			ContentType: contentType,
		}),
	);
}

export async function getObject(
	key: string,
): Promise<{ body: Uint8Array; contentType: string }> {
	const res = await s3.send(
		new GetObjectCommand({ Bucket: bucket, Key: key }),
	);
	const body = await res.Body!.transformToByteArray();
	return { body, contentType: res.ContentType ?? 'application/octet-stream' };
}

export async function deleteObject(key: string) {
	await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
