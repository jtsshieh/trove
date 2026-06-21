import { PropsWithChildren } from 'react';

import { AppShell } from '@/components/app-shell/app-shell';
import { getCurrentUserSafe, isAdmin } from '@/lib/auth';

export default async function AccountLayout({ children }: PropsWithChildren) {
	const user = await getCurrentUserSafe();
	return (
		<AppShell
			appName="Account"
			username={user.username}
			isAdmin={isAdmin(user)}
			sections={[]}
		>
			{children}
		</AppShell>
	);
}
