import { Package, Plug, SprayCan, WashingMachine } from 'lucide-react';
import { PropsWithChildren } from 'react';

import { AppShell } from '@/components/app-shell/app-shell';
import { getCurrentUserSafe, isAdmin } from '@/lib/auth';

export default async function BathroomLayout({ children }: PropsWithChildren) {
	const user = await getCurrentUserSafe();
	return (
		<AppShell
			appId="bathroom"
			username={user.username}
			isAdmin={isAdmin(user)}
			sections={[
				{
					name: 'Catalog',
					href: '/bathroom/catalog',
					icon: <Package className="size-4" />,
				},
				{
					name: 'Consumables',
					href: '/bathroom/consumables',
					icon: <SprayCan className="size-4" />,
				},
				{
					name: 'Appliances',
					href: '/bathroom/appliances',
					icon: <Plug className="size-4" />,
				},
				{
					name: 'Launderables',
					href: '/bathroom/launderables',
					icon: <WashingMachine className="size-4" />,
				},
			]}
		>
			{children}
		</AppShell>
	);
}
