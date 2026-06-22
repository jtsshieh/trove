import { Server, Users } from 'lucide-react';
import { PropsWithChildren } from 'react';

import { AppShell } from '@/components/app-shell/app-shell';
import { requireAdminPage } from '@/lib/auth';

export default async function AdminLayout({ children }: PropsWithChildren) {
	const user = await requireAdminPage();
	return (
		<AppShell
			appId="admin"
			username={user.username}
			isAdmin
			sections={[
				{
					name: 'Users',
					href: '/admin/users',
					icon: <Users className="size-4" />,
				},
				{
					name: 'System',
					href: '/admin/system',
					icon: <Server className="size-4" />,
				},
			]}
		>
			{children}
		</AppShell>
	);
}
