import { api } from '@/lib/api/client';

import type { UserRole } from '@/generated/prisma/enums';
import type { AdminUserDTO } from '@/lib/domains/admin/users';

export const createUser = (input: {
	username: string;
	password: string;
	role: UserRole;
}) => api.post<AdminUserDTO>('/api/admin/users', input);

export const deleteUser = (id: string) =>
	api.del<{ success: boolean }>(`/api/admin/users/${id}`);

export const setUserRole = (id: string, role: UserRole) =>
	api.patch<{ success: boolean }>(`/api/admin/users/${id}`, { role });

export const resetUserPassword = (id: string, password: string) =>
	api.patch<{ success: boolean }>(`/api/admin/users/${id}/password`, {
		password,
	});
