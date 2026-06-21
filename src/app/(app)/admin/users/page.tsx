import { getCurrentUserSafe } from '@/lib/auth';
import { getAllUsers } from '@/lib/domains/admin/users';

import { UsersManager } from './users-manager';

export default async function AdminUsersPage() {
	const me = await getCurrentUserSafe();
	const users = await getAllUsers();
	return (
		<div className="mx-auto w-full max-w-screen-md">
			<UsersManager users={users} currentUserId={me.id} />
		</div>
	);
}
