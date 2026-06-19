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
		<div className="flex flex-col gap-1 rounded-xl bg-neutral-100 p-1 sm:flex-row">
			{routes.map(({ name, href }) => (
				<Button
					key={name}
					variant="secondary"
					size="flexible"
					className={cn(
						'bg-transparent px-3 py-1.5 text-sm font-medium hover:bg-white',
						[href, href.replace('/', '')].includes(pathname.split('/')[3]) &&
							'bg-white',
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
