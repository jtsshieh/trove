import Link from 'next/link';
import React from 'react';

import type { AppDef } from '@/lib/apps';
import { cn } from '@/lib/utils';

/** iOS-style app icons: a rounded tile + small label, used by the launcher and the
 * in-shell app switcher. */
export function AppTiles({
	apps,
	size = 'lg',
	onNavigate,
}: {
	apps: AppDef[];
	size?: 'sm' | 'lg';
	onNavigate?: () => void;
}) {
	const s =
		size === 'lg'
			? {
					tile: 'size-20 rounded-3xl',
					icon: 'size-9',
					label: 'text-sm',
					w: 'w-24',
				}
			: {
					tile: 'size-14 rounded-2xl',
					icon: 'size-6',
					label: 'text-xs',
					w: 'w-16',
				};

	return (
		<div
			className={cn(
				'flex flex-wrap',
				size === 'lg' ? 'gap-x-4 gap-y-6' : 'gap-x-3 gap-y-4',
			)}
		>
			{apps.map((app) => (
				<Link
					key={app.id}
					href={app.href}
					onClick={onNavigate}
					className={cn('group flex flex-col items-center gap-2', s.w)}
				>
					<div
						className={cn(
							'bg-brand-subtle text-brand ring-foreground/5 flex items-center justify-center shadow-sm ring-1 transition group-hover:scale-105 group-active:scale-95',
							s.tile,
						)}
					>
						<app.icon className={s.icon} />
					</div>
					<span
						className={cn(
							'w-full truncate text-center font-medium text-neutral-700',
							s.label,
						)}
					>
						{app.name}
					</span>
				</Link>
			))}
		</div>
	);
}
