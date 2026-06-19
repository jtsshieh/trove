import {
	QueryClient,
	defaultShouldDehydrateQuery,
	isServer,
} from '@tanstack/react-query';
import superjson from 'superjson';

function makeQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 60 * 1000,
			},
			dehydrate: {
				// superjson preserves rich types (e.g. Date) across the
				// server -> client hydration boundary.
				serializeData: superjson.serialize,
				// Include pending queries in dehydration so the server can stream
				// not-yet-resolved queries to the client (non-blocking prefetch).
				shouldDehydrateQuery: (query) =>
					defaultShouldDehydrateQuery(query) ||
					query.state.status === 'pending',
			},
			hydrate: {
				deserializeData: superjson.deserialize,
			},
		},
	});
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
	if (isServer) {
		// Server: always make a new query client per request.
		return makeQueryClient();
	}
	// Browser: reuse the client across renders so cache survives Suspense.
	if (!browserQueryClient) browserQueryClient = makeQueryClient();
	return browserQueryClient;
}
