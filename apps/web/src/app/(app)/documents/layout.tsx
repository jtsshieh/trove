import { FileText } from 'lucide-react';
import { PropsWithChildren } from 'react';

import { AppShell } from '@/components/app-shell/app-shell';
import { getCurrentUserSafe, isAdmin } from '@/lib/auth';

export default async function DocumentsLayout({ children }: PropsWithChildren) {
	const user = await getCurrentUserSafe();
	return (
		<AppShell
			appId="documents"
			username={user.username}
			isAdmin={isAdmin(user)}
			sections={[
				{
					name: 'Documents',
					href: '/documents',
					icon: <FileText className="size-4" />,
				},
			]}
		>
			{children}
		</AppShell>
	);
}
