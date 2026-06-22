import { Home, type LucideIcon } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import React, { type CSSProperties } from 'react';

import { accentStyle, type AppDef } from '@/lib/apps';
import { cn } from '@/lib/utils';

const SIZES = {
	lg: {
		tile: 'size-20 rounded-3xl',
		icon: 'size-9',
		label: 'text-sm',
		w: 'w-24',
	},
	sm: {
		tile: 'size-14 rounded-2xl',
		icon: 'size-6',
		label: 'text-xs',
		w: 'w-16',
	},
} as const;

type SizeKey = keyof typeof SIZES;

function Tile({
	href,
	label,
	Icon,
	tileClassName,
	style,
	s,
	onNavigate,
}: {
	href: Route;
	label: string;
	Icon: LucideIcon;
	tileClassName: string;
	style?: CSSProperties;
	s: (typeof SIZES)[SizeKey];
	onNavigate?: () => void;
}) {
	return (
		<Link
			href={href}
			onClick={onNavigate}
			className={cn('group flex flex-col items-center gap-2', s.w)}
		>
			<div
				style={style}
				className={cn(
					'ring-foreground/5 flex items-center justify-center shadow-sm ring-1 transition group-hover:scale-105 group-active:scale-95',
					s.tile,
					tileClassName,
				)}
			>
				<Icon className={s.icon} />
			</div>
			<span
				className={cn(
					'w-full truncate text-center font-medium text-neutral-700',
					s.label,
				)}
			>
				{label}
			</span>
		</Link>
	);
}

/** iOS-style app icons: a rounded tile + small label, used by the launcher and the
 * in-shell app switcher. `home` prepends a Home tile (the switcher uses it). */
export function AppTiles({
	apps,
	size = 'lg',
	home = false,
	onNavigate,
}: {
	apps: AppDef[];
	size?: SizeKey;
	home?: boolean;
	onNavigate?: () => void;
}) {
	const s = SIZES[size];

	return (
		<div
			className={cn(
				'flex flex-wrap',
				size === 'lg' ? 'gap-x-4 gap-y-6' : 'gap-x-3 gap-y-4',
			)}
		>
			{home && (
				<Tile
					href="/"
					label="Home"
					Icon={Home}
					tileClassName="bg-neutral-100 text-neutral-600"
					s={s}
					onNavigate={onNavigate}
				/>
			)}
			{apps.map((app) => (
				<Tile
					key={app.id}
					href={app.href}
					label={app.name}
					Icon={app.icon}
					tileClassName="bg-brand-subtle text-brand"
					style={accentStyle(app.accent)}
					s={s}
					onNavigate={onNavigate}
				/>
			))}
		</div>
	);
}
