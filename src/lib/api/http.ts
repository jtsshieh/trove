import { NextResponse, type NextRequest } from 'next/server';
import superjson from 'superjson';
import { z, ZodError, type ZodType } from 'zod';

import {
	getCurrentUser,
	type UserDTO,
} from '@/app/dashboard/(main)/account/_data/fetchers';

import { ApiError } from './errors';

/**
 * Server-only route layer. This is the single place every API route runs auth,
 * input validation, and error -> JSON mapping — the "benefits of server actions"
 * (typed boundary, guaranteed auth, consistent errors) without being one.
 *
 * Responses are superjson-encoded so rich types (Date, Decimal, etc.) survive the
 * wire; the browser `api` client (./client) deserializes symmetrically. Errors are
 * plain JSON (`{ error, code }`) with a real HTTP status.
 */

/**
 * The parsed value a schema yields (its `output`/`infer` type — what `parse()`
 * returns at runtime, so the handler sees post-`.default()`/`coerce`/transform
 * values), or `undefined` when no schema is supplied for that slot.
 */
type Parsed<S> = S extends ZodType ? z.output<S> : undefined;

interface RouteConfig<PSchema, BSchema, QSchema, R> {
	/** zod schema for the dynamic route segment(s), e.g. `{ id }`. */
	params?: PSchema;
	/** zod schema for the JSON request body (POST/PATCH/PUT/DELETE). */
	body?: BSchema;
	/** zod schema for the `?query=string` params (coerce as needed). */
	query?: QSchema;
	handler: (ctx: {
		req: NextRequest;
		user: UserDTO;
		params: Parsed<PSchema>;
		body: Parsed<BSchema>;
		query: Parsed<QSchema>;
	}) => Promise<R>;
}

type NextContext = { params: Promise<Record<string, string>> };

/**
 * Builds a Next route handler that authenticates the user, validates params/body/
 * query against the provided zod schemas, runs `handler`, and returns the result
 * superjson-encoded. Any thrown `ApiError` (or `ZodError`) becomes a JSON error
 * with the right status.
 */
export function authedRoute<
	PSchema extends ZodType | undefined = undefined,
	BSchema extends ZodType | undefined = undefined,
	QSchema extends ZodType | undefined = undefined,
	R = unknown,
>(config: RouteConfig<PSchema, BSchema, QSchema, R>) {
	return async (req: NextRequest, context: NextContext) => {
		try {
			const user = await getCurrentUser();
			if (!user) throw new ApiError(401, 'Unauthorized');

			const rawParams = (await context?.params) ?? {};
			const params = (
				config.params ? config.params.parse(rawParams) : undefined
			) as Parsed<PSchema>;
			const body = (
				config.body ? config.body.parse(await readJson(req)) : undefined
			) as Parsed<BSchema>;
			const query = (
				config.query
					? config.query.parse(Object.fromEntries(req.nextUrl.searchParams))
					: undefined
			) as Parsed<QSchema>;

			const result = await config.handler({ req, user, params, body, query });
			return NextResponse.json(superjson.serialize(result));
		} catch (error) {
			return toErrorResponse(error);
		}
	};
}

interface PublicRouteConfig<PSchema, BSchema, QSchema, R> {
	params?: PSchema;
	body?: BSchema;
	query?: QSchema;
	handler: (ctx: {
		req: NextRequest;
		params: Parsed<PSchema>;
		body: Parsed<BSchema>;
		query: Parsed<QSchema>;
	}) => Promise<R>;
}

/**
 * Like `authedRoute` but WITHOUT the authentication gate — for endpoints that run
 * before a session exists (sign-in, sign-up, passkey authentication). Same zod
 * validation, superjson output, and error envelope. The handler sets the auth
 * cookie itself via `next/headers` `cookies()`.
 */
export function publicRoute<
	PSchema extends ZodType | undefined = undefined,
	BSchema extends ZodType | undefined = undefined,
	QSchema extends ZodType | undefined = undefined,
	R = unknown,
>(config: PublicRouteConfig<PSchema, BSchema, QSchema, R>) {
	return async (req: NextRequest, context: NextContext) => {
		try {
			const rawParams = (await context?.params) ?? {};
			const params = (
				config.params ? config.params.parse(rawParams) : undefined
			) as Parsed<PSchema>;
			const body = (
				config.body ? config.body.parse(await readJson(req)) : undefined
			) as Parsed<BSchema>;
			const query = (
				config.query
					? config.query.parse(Object.fromEntries(req.nextUrl.searchParams))
					: undefined
			) as Parsed<QSchema>;

			const result = await config.handler({ req, params, body, query });
			return NextResponse.json(superjson.serialize(result));
		} catch (error) {
			return toErrorResponse(error);
		}
	};
}

async function readJson(req: NextRequest): Promise<unknown> {
	const text = await req.text();
	// Bodies are superjson-encoded by the browser `api` client (symmetric with the
	// superjson response), so Date/etc. survive and zod `z.date()` schemas validate.
	return text ? superjson.parse(text) : undefined;
}

function toErrorResponse(error: unknown): NextResponse {
	if (error instanceof ApiError) {
		return NextResponse.json(
			{ error: error.message, code: error.code },
			{ status: error.status },
		);
	}
	if (error instanceof ZodError) {
		return NextResponse.json(
			{ error: 'Invalid input', issues: error.issues },
			{ status: 400 },
		);
	}
	console.error('API route error', error);
	return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
