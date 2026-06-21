import { api } from '@/lib/api/client';

export const submitSetup = (username: string, password: string) =>
	api.post<{ success: boolean }>('/api/setup', { username, password });
