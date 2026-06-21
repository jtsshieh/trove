// Shared between the server layout (reads it) and the client trip-nav (writes
// it). MUST live in a non-'use client' module: a string exported from a client
// module becomes a client reference when imported server-side, so the layout
// would otherwise look up `undefined` and never see the persisted value.
export const SIDEBAR_COOKIE = 'pkl_trip_nav_collapsed';
