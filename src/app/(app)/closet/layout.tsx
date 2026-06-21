import { Box, PillBottle, Shirt } from 'lucide-react';
import { PropsWithChildren } from 'react';

import { AppShell } from '@/components/app-shell/app-shell';
import { getCurrentUserSafe, isAdmin } from '@/lib/auth';

export default async function ClosetLayout({ children }: PropsWithChildren) {
	const user = await getCurrentUserSafe();
	return (
		<AppShell
			appId="closet"
			username={user.username}
			isAdmin={isAdmin(user)}
			sections={[
				{
					name: 'Clothing',
					href: '/closet/clothing',
					icon: <Shirt className="size-4" />,
				},
				{
					name: 'Essentials',
					href: '/closet/essentials',
					icon: <PillBottle className="size-4" />,
				},
				{
					name: 'Packing Gear',
					href: '/closet/packing-gear',
					icon: <Box className="size-4" />,
				},
			]}
		>
			{children}
		</AppShell>
	);
}
