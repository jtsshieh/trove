import { PropsWithChildren } from 'react';

import { AppShell } from '@/components/app-shell/app-shell';
import { getCurrentUserSafe, isAdmin } from '@/lib/auth';

export default async function OutfitsLayout({ children }: PropsWithChildren) {
	const user = await getCurrentUserSafe();
	return (
		<AppShell
			appName="Outfits"
			username={user.username}
			isAdmin={isAdmin(user)}
			sections={[]}
		>
			{children}
		</AppShell>
	);
}
