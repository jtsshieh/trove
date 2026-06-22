import { cache } from 'react';

import { getStatus } from './service';

/**
 * Server-side loader for the system status — the same updater read the client polls,
 * used to seed the query cache so the System page renders without an initial spinner.
 */
export const getSystemStatus = cache(() => getStatus());
