import { Server, Shirt, Users } from 'lucide-react';
import { PropsWithChildren } from 'react';

import { AppShell } from '@/components/app-shell/app-shell';
import { requireAdminPage } from '@/lib/auth';

export default async function AdminLayout({ children }: PropsWithChildren) {
	const user = await requireAdminPage();
	return (
		<AppShell
			appName="Admin"
			username={user.username}
			isAdmin
			sections={[
				{
					name: 'Users',
					href: '/admin/users',
					icon: <Users className="size-4" />,
				},
				{
					name: 'Clothing Types',
					href: '/admin/clothing-types',
					icon: <Shirt className="size-4" />,
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
