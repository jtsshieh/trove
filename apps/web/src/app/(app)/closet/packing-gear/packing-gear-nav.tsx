'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const routes = [
	{ name: 'Luggage', href: '/luggage' },
	{ name: 'Containers', href: '/containers' },
] as const;

/** Route-based nav styled to match the TabsList used by Clothing/Essentials. */
export function PackingGearNav() {
	const pathname = usePathname();
	return (
		<div className="text-muted-foreground inline-flex h-8 w-fit items-center justify-center rounded-lg bg-muted p-[3px]">
			{routes.map(({ name, href }) => {
				const active = [href, href.replace('/', '')].includes(
					pathname.split('/')[3],
				);
				return (
					<Link
						key={name}
						href={`/closet/packing-gear${href}`}
						className={cn(
							'text-foreground/60 hover:text-foreground inline-flex h-[calc(100%-1px)] items-center justify-center rounded-md px-2.5 text-sm font-medium whitespace-nowrap transition-colors',
							active && 'bg-background text-foreground shadow-sm',
						)}
					>
						{name}
					</Link>
				);
			})}
		</div>
	);
}
