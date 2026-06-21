import { api } from '@/lib/api/client';

import type { SystemStatus, UpdateCheck } from './schemas';

/** Client-side fetchers for the admin System (updates) surface. */

export const fetchSystemStatus = () =>
	api.get<SystemStatus>('/api/system/status');

export const checkForUpdate = () => api.post<UpdateCheck>('/api/system/check');

export const triggerUpdate = () => api.post<SystemStatus>('/api/system/update');
