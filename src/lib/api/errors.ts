/**
 * The one error type the API speaks. Thrown inside route handlers / services and
 * turned into a JSON error envelope by `authedRoute`; re-thrown on the client by
 * the `api` fetch wrapper so callers can branch on `status` / `code`.
 *
 * Lives in a client-safe module (no server imports) so both the route layer and
 * the browser fetch client can share it.
 */
export class ApiError extends Error {
	readonly status: number;
	readonly code?: string;

	constructor(status: number, message: string, code?: string) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.code = code;
	}
}

/** Shape of the JSON body returned for any non-2xx response. */
export interface ApiErrorBody {
	error: string;
	code?: string;
	issues?: unknown;
}
