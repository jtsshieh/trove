import { ApiError } from '@/lib/api/errors';

import {
	systemStatusSchema,
	updateCheckSchema,
	type SystemStatus,
	type UpdateCheck,
} from './schemas';

/**
 * Server-only client for the headless `updater` sidecar. Reachable only on the
 * internal Docker network and gated by a shared token — never exposed to the LAN.
 */

const UPDATER_URL = process.env.UPDATER_URL ?? 'http://updater:9000';
const UPDATER_TOKEN = process.env.UPDATER_TOKEN;

async function updaterFetch(
	path: string,
	init?: RequestInit,
): Promise<unknown> {
	if (!UPDATER_TOKEN) throw new ApiError(500, 'Updater is not configured');
	let res: Response;
	try {
		res = await fetch(`${UPDATER_URL}${path}`, {
			...init,
			headers: { ...init?.headers, 'x-updater-token': UPDATER_TOKEN },
			cache: 'no-store',
		});
	} catch {
		throw new ApiError(502, 'Updater is unreachable');
	}
	if (!res.ok) {
		throw new ApiError(502, `Updater error (${res.status})`);
	}
	return res.json();
}

export async function getStatus(): Promise<SystemStatus> {
	return systemStatusSchema.parse(await updaterFetch('/status'));
}

export async function checkForUpdate(): Promise<UpdateCheck> {
	return updateCheckSchema.parse(
		await updaterFetch('/check', { method: 'POST' }),
	);
}

export async function triggerUpdate(): Promise<SystemStatus> {
	return systemStatusSchema.parse(
		await updaterFetch('/update', { method: 'POST' }),
	);
}
