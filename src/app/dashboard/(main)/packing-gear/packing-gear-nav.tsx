'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '../../../../components/ui/button';
import { cn } from '../../../../lib/utils';

const routes = [
	{ name: 'Luggage', href: '/luggage' },
	{ name: 'Containers', href: '/containers' },
] as const;
export function PackingGearNav() {
	const pathname = usePathname();
	return (
		<div className="flex flex-row gap-1 self-start rounded-xl bg-panel p-1">
			{routes.map(({ name, href }) => (
				<Button
					key={name}
					variant="secondary"
					size="flexible"
					className={cn(
						'bg-transparent px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-card hover:text-foreground',
						[href, href.replace('/', '')].includes(pathname.split('/')[3]) &&
							'bg-card text-foreground shadow-sm',
					)}
					nativeButton={false}
					render={<Link href={`/dashboard/packing-gear${href}`} />}
				>
					{name}
				</Button>
			))}
		</div>
	);
}
