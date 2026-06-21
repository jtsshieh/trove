import superjson from 'superjson';

import { ApiError, type ApiErrorBody } from './errors';

/**
 * Browser-side typed fetch client. Every read query and write mutation goes
 * through here. Success bodies are superjson-decoded (so Date/Decimal survive);
 * non-2xx bodies become a thrown `ApiError` carrying the server's status + code.
 *
 * Only ever runs in the browser — server prefetch reads the DB directly via each
 * domain's `fetchers.ts`, so this module never needs absolute URLs or cookies.
 */

type QueryValue = string | number | boolean | undefined | null;
type QueryParams = Record<string, QueryValue>;

function toQueryString(query: QueryParams): string {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(query)) {
		if (value !== undefined && value !== null) params.set(key, String(value));
	}
	const string = params.toString();
	return string ? `?${string}` : '';
}

async function request<R>(
	method: string,
	path: string,
	opts?: { body?: unknown; query?: QueryParams },
): Promise<R> {
	const url = opts?.query ? path + toQueryString(opts.query) : path;
	const init: RequestInit = { method };
	if (opts?.body !== undefined) {
		init.headers = { 'content-type': 'application/json' };
		// superjson so rich types (Date, etc.) survive the request body symmetrically
		// with the response — the route parses it back with superjson before zod.
		init.body = superjson.stringify(opts.body);
	}

	const res = await fetch(url, init);

	if (!res.ok) {
		const payload = (await res.json().catch(() => ({}))) as ApiErrorBody;
		throw new ApiError(res.status, payload.error ?? res.statusText, payload.code);
	}

	if (res.status === 204) return undefined as R;
	return superjson.deserialize(await res.json()) as R;
}

export const api = {
	get: <R>(path: string, query?: QueryParams) => request<R>('GET', path, { query }),
	post: <R>(path: string, body?: unknown) => request<R>('POST', path, { body }),
	patch: <R>(path: string, body?: unknown) =>
		request<R>('PATCH', path, { body }),
	put: <R>(path: string, body?: unknown) => request<R>('PUT', path, { body }),
	del: <R>(path: string, body?: unknown) =>
		request<R>('DELETE', path, { body }),
};
