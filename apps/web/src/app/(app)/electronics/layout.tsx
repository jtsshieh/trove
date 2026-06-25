import { Cpu } from 'lucide-react';
import { PropsWithChildren } from 'react';

import { AppShell } from '@/components/app-shell/app-shell';
import { getCurrentUserSafe, isAdmin } from '@/lib/auth';

export default async function ElectronicsLayout({
	children,
}: PropsWithChildren) {
	const user = await getCurrentUserSafe();
	return (
		<AppShell
			appId="electronics"
			username={user.username}
			isAdmin={isAdmin(user)}
			sections={[
				{
					name: 'Electronics',
					href: '/electronics',
					icon: <Cpu className="size-4" />,
				},
			]}
		>
			{children}
		</AppShell>
	);
}
