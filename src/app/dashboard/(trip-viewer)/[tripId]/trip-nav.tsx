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
	Menu,
	PillBottle,
	Search,
	Settings,
	Shirt,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';

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

import { changeTripMode } from './_data/actions';

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

export function TripSideNav({ trip }: { trip: Trip }) {
	const pathname = usePathname();

	return (
		<nav className="r-0 flex h-full min-h-0 flex-col gap-2 overflow-y-auto sm:border-r">
			<div className="flex flex-col gap-4 border-b px-8 pt-8 pb-4">
				<div className="flex flex-col">
					<h1 className="text-xl font-bold">{trip.name}</h1>
					<p className="text-sm">
						{format(trip.start, 'LLL dd, y')} - {format(trip.end, 'LLL dd, y')}
					</p>
				</div>
				<TripModeSelector tripId={trip.id} tripMode={trip.mode} />
			</div>
			<div className="flex flex-col gap-2 p-4">
				{navRoutes
					.filter((route) =>
						(route.mode as readonly TripMode[]).includes(trip.mode),
					)
					.map(({ href, icon, name }) => (
						<Button
							key={href}
							variant="ghost"
							className={cn(
								'w-full justify-start gap-2',
								[href, href.replace('/', '')].includes(
									pathname.split('/')[3] ?? '',
								) &&
									'bg-neutral-900 text-neutral-100 hover:bg-neutral-800 hover:text-neutral-100',
							)}
							nativeButton={false}
							render={<Link href={`/dashboard/${trip.id}${href}`} />}
						>
							{icon} {name}
						</Button>
					))}
			</div>

			<div className="mt-auto p-4">
				<Button
					variant="ghost"
					className="w-full justify-start"
					nativeButton={false}
					render={<Link href="/dashboard" />}
				>
					<ChevronLeft /> Return to Dashboard
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
				<TripSideNav trip={trip} />
			</SheetContent>
		</Sheet>
	);
}
function TripModeSelector({
	tripId,
	tripMode,
}: {
	tripId: string;
	tripMode: TripMode;
}) {
	return (
		<Select
			value={tripMode}
			onValueChange={async (value) => {
				await changeTripMode(tripId, { mode: value as TripMode });
			}}
		>
			<SelectTrigger className="w-full">
				<SelectValue />
			</SelectTrigger>
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
