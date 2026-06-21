'use client';

import type { Trip } from '@/generated/prisma/client';
import { TripMode } from '@/generated/prisma/enums';
import { format } from 'date-fns';
import {
	Box,
	ChevronLeft,
	Home,
	Kanban,
	Luggage,
	type LucideIcon,
	Menu,
	PanelLeftClose,
	PanelLeftOpen,
	PillBottle,
	Search,
	Settings,
	Shirt,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

import { changeTripMode } from './_data/api';
import { SIDEBAR_COOKIE } from './sidebar-cookie';

const navRoutes = [
	{
		name: 'Home',
		icon: <Home />,
		href: '',
		mode: [TripMode.Provision, TripMode.Pack, TripMode.Audit],
	},
	{
		name: 'Clothing',
		icon: <Shirt />,
		href: '/clothing',
		mode: [TripMode.Provision],
	},
	{
		name: 'Essentials',
		icon: <PillBottle />,
		href: '/essentials',
		mode: [TripMode.Provision],
	},
	{
		name: 'Containers',
		icon: <Box />,
		href: '/containers',
		mode: [TripMode.Provision, TripMode.Pack],
	},
	{
		name: 'Luggage',
		icon: <Luggage />,
		href: '/luggage',
		mode: [TripMode.Provision, TripMode.Pack],
	},
	{
		name: 'Search',
		icon: <Search />,
		href: '/search',
		mode: [TripMode.Audit],
	},
	{
		name: 'Manage Trip',
		icon: <Settings />,
		href: '/manage',
		mode: [TripMode.Provision, TripMode.Pack, TripMode.Audit],
	},
] as const;

const MODE_META: Record<TripMode, { label: string; icon: LucideIcon }> = {
	[TripMode.Provision]: { label: 'Provisioning', icon: Kanban },
	[TripMode.Pack]: { label: 'Packing', icon: Luggage },
	[TripMode.Audit]: { label: 'Auditing', icon: Search },
};

/**
 * The trip-viewer left rail. On desktop it collapses to an icon-only rail
 * (toggle button or ⌘/Ctrl-B), persisting the choice in a cookie so the server
 * renders the right width with no hydration flash. Inside the mobile Sheet it is
 * always expanded (`collapsible={false}`).
 */
export function TripSideNav({
	trip,
	defaultCollapsed = false,
	collapsible = true,
}: {
	trip: Trip;
	defaultCollapsed?: boolean;
	collapsible?: boolean;
}) {
	const pathname = usePathname();
	const [collapsed, setCollapsed] = useState(defaultCollapsed);

	const toggle = useCallback(() => setCollapsed((prev) => !prev), []);

	// Persist the choice in a cookie the server layout reads on the next request
	// (so a reload renders the right width with no hydration flash). Writing from
	// an effect keeps it in lock-step with state and out of the render path.
	useEffect(() => {
		if (!collapsible) return;
		document.cookie = `${SIDEBAR_COOKIE}=${collapsed}; path=/; max-age=31536000; samesite=lax`;
	}, [collapsed, collapsible]);

	useEffect(() => {
		if (!collapsible) return;
		function onKey(e: KeyboardEvent) {
			if (e.key !== 'b' || !(e.metaKey || e.ctrlKey)) return;
			const el = document.activeElement;
			if (
				el instanceof HTMLInputElement ||
				el instanceof HTMLTextAreaElement ||
				(el instanceof HTMLElement && el.isContentEditable)
			)
				return;
			e.preventDefault();
			toggle();
		}
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [collapsible, toggle]);

	const isCollapsed = collapsible && collapsed;

	return (
		<nav
			data-collapsed={isCollapsed || undefined}
			className={cn(
				'flex h-full min-h-0 flex-col gap-2 overflow-x-hidden overflow-y-auto sm:border-r',
				collapsible
					? cn(
							'transition-[width] duration-[var(--dur-dropdown)] ease-[var(--ease-out)]',
							isCollapsed ? 'w-16' : 'w-64',
						)
					: 'w-full',
			)}
		>
			<div
				className={cn(
					'flex flex-col border-b',
					isCollapsed ? 'gap-3 px-2 pt-6 pb-4' : 'gap-4 px-6 pt-6 pb-4',
				)}
			>
				<div
					className={cn(
						'flex items-center gap-2',
						isCollapsed && 'justify-center',
					)}
				>
					{!isCollapsed && (
						<div className="flex min-w-0 flex-1 flex-col">
							<h1 className="truncate text-lg font-bold tracking-tight">
								{trip.name}
							</h1>
							<p className="text-muted-foreground truncate text-xs">
								{format(trip.start, 'LLL d')} – {format(trip.end, 'LLL d, y')}
							</p>
						</div>
					)}
					{collapsible && (
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={toggle}
							className="shrink-0"
							aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
							title={isCollapsed ? 'Expand sidebar (⌘B)' : 'Collapse sidebar (⌘B)'}
						>
							{isCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
						</Button>
					)}
				</div>
				<TripModeSelector
					tripId={trip.id}
					tripMode={trip.mode}
					collapsed={isCollapsed}
				/>
			</div>

			<div
				className={cn('flex flex-col gap-1', isCollapsed ? 'px-2 py-2' : 'p-4')}
			>
				{navRoutes
					.filter((route) =>
						(route.mode as readonly TripMode[]).includes(trip.mode),
					)
					.map(({ href, icon, name }) => {
						const active = [href, href.replace('/', '')].includes(
							pathname.split('/')[3] ?? '',
						);
						return (
							<Button
								key={href}
								variant="ghost"
								data-active={active || undefined}
								aria-current={active ? 'page' : undefined}
								aria-label={isCollapsed ? name : undefined}
								title={isCollapsed ? name : undefined}
								className={cn(
									'w-full gap-2',
									isCollapsed ? 'justify-center px-0' : 'justify-start',
									active &&
										'bg-brand-subtle text-brand hover:bg-brand-subtle hover:text-brand',
								)}
								nativeButton={false}
								render={<Link href={`/dashboard/${trip.id}${href}`} />}
							>
								{icon}
								{!isCollapsed && <span className="truncate">{name}</span>}
							</Button>
						);
					})}
			</div>

			<div className={cn('mt-auto', isCollapsed ? 'p-2' : 'p-4')}>
				<Button
					variant="ghost"
					className={cn('w-full', isCollapsed ? 'justify-center px-0' : 'justify-start')}
					aria-label={isCollapsed ? 'Return to Dashboard' : undefined}
					title={isCollapsed ? 'Return to Dashboard' : undefined}
					nativeButton={false}
					render={<Link href="/dashboard" />}
				>
					<ChevronLeft />
					{!isCollapsed && <span className="truncate">Return to Dashboard</span>}
				</Button>
			</div>
		</nav>
	);
}

export function MobileTripNav({ trip }: { trip: Trip }) {
	const [open, setOpen] = useState(false);
	const pathname = usePathname();

	useEffect(() => {
		setOpen(false);
	}, [pathname]);

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger render={<Button variant="outline" size="icon" />}>
				<Menu />
			</SheetTrigger>
			<SheetContent side="left" className="h-full p-0">
				<TripSideNav trip={trip} collapsible={false} />
			</SheetContent>
		</Sheet>
	);
}

function TripModeSelector({
	tripId,
	tripMode,
	collapsed,
}: {
	tripId: string;
	tripMode: TripMode;
	collapsed: boolean;
}) {
	const meta = MODE_META[tripMode];
	const Icon = meta.icon;
	const router = useRouter();
	return (
		<Select
			value={tripMode}
			onValueChange={async (value) => {
				try {
					await changeTripMode(tripId, value as TripMode);
					// The nav (which tabs show) is server-rendered from the trip's mode —
					// refresh the layout to reflect the new mode.
					router.refresh();
				} catch {
					toast.error('Could not change trip mode');
				}
			}}
		>
			{collapsed ? (
				<SelectTrigger
					aria-label={`Trip mode: ${meta.label}`}
					title={meta.label}
					className="size-9 justify-center gap-0 px-0 [&>svg:last-of-type]:hidden"
				>
					<Icon className="size-4" />
				</SelectTrigger>
			) : (
				<SelectTrigger className="w-full">
					<SelectValue />
				</SelectTrigger>
			)}
			<SelectContent>
				<SelectItem value="Provision">
					<div className="flex items-center gap-1">
						<Kanban /> Provisioning
					</div>
				</SelectItem>
				<SelectItem value="Pack">
					<div className="flex items-center gap-1">
						<Luggage /> Packing
					</div>
				</SelectItem>
				<SelectItem value="Audit">
					<div className="flex items-center gap-1">
						<Search /> Auditing
					</div>
				</SelectItem>
			</SelectContent>
		</Select>
	);
}
