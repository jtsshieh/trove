'use client';

import {
	Home,
	LogOut,
	Luggage,
	Menu,
	PillBottle,
	Server,
	Settings,
	Shirt,
	X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { signOut } from '../../(auth)/_data/api';
import { Avatar, AvatarFallback } from '../../../components/ui/avatar';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetTrigger,
} from '../../../components/ui/sheet';
import type { UserDTO } from './account/_data/fetchers';

const navLinks = [
	{ name: 'Home', icon: <Home />, href: '' },
	{ name: 'Wardrobe', icon: <Shirt />, href: '/wardrobe' },
	{ name: 'Essentials', icon: <PillBottle />, href: '/essentials' },
	{ name: 'Packing Gear', icon: <Luggage />, href: '/packing-gear' },
] as const;

export function DashboardNav({
	user,
	isAdmin,
}: {
	user: UserDTO;
	isAdmin: boolean;
}) {
	const pathname = usePathname();
	const router = useRouter();

	const handleSignOut = async () => {
		await signOut();
		router.push('/sign-in');
	};

	return (
		<nav className="flex w-full flex-col justify-between gap-0 px-4 py-2 sm:flex-row sm:gap-4">
			<div
				className={cn('flex flex-col gap-1 py-4 sm:flex-row sm:gap-2 sm:py-0')}
			>
				{navLinks.map(({ name, icon, href }) => (
					<Button
						key={name}
						variant="ghost"
						className={cn(
							'flex justify-start gap-2',
							[href, href.replace('/', '')].includes(
								pathname.split('/')[2] ?? '',
							) &&
								'bg-brand-subtle text-brand hover:bg-brand-subtle hover:text-brand',
						)}
						nativeButton={false}
						render={<Link href={`/dashboard${href}`} />}
					>
						{icon} {name}
					</Button>
				))}
			</div>
			<div className="flex flex-col gap-1 border-t py-4 sm:hidden sm:gap-2">
				<div className="mb-2 flex flex-row items-center gap-2 px-2">
					<Avatar>
						<AvatarFallback>:)</AvatarFallback>
					</Avatar>
					<p className="font-bold">{user.username}</p>
				</div>
				<Button
					variant="ghost"
					className={cn(
						'flex justify-start gap-2',
						(pathname.split('/')[2] ?? '') === 'account' &&
							'bg-brand-subtle text-brand hover:bg-brand-subtle hover:text-brand',
					)}
					nativeButton={false}
					render={<Link href="/dashboard/account" />}
				>
					<Settings />
					Settings
				</Button>
				{isAdmin && (
					<Button
						variant="ghost"
						className={cn(
							'flex justify-start gap-2',
							(pathname.split('/')[2] ?? '') === 'system' &&
								'bg-brand-subtle text-brand hover:bg-brand-subtle hover:text-brand',
						)}
						nativeButton={false}
						render={<Link href="/dashboard/system" />}
					>
						<Server />
						System
					</Button>
				)}
				<Button
					variant="ghost"
					className={cn('flex justify-start gap-2')}
					onClick={handleSignOut}
				>
					<LogOut />
					Sign out
				</Button>
			</div>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<button
							type="button"
							aria-label="Account menu"
							className="hidden rounded-full select-none sm:block"
						/>
					}
				>
					<Avatar>
						<AvatarFallback>:)</AvatarFallback>
					</Avatar>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuGroup>
						<DropdownMenuLabel>{user.username}</DropdownMenuLabel>
					</DropdownMenuGroup>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						className="flex gap-2"
						nativeButton={false}
						render={<Link href="/dashboard/account" />}
					>
						<Settings />
						Settings
					</DropdownMenuItem>
					{isAdmin && (
						<DropdownMenuItem
							className="flex gap-2"
							nativeButton={false}
							render={<Link href="/dashboard/system" />}
						>
							<Server />
							System
						</DropdownMenuItem>
					)}
					<DropdownMenuSeparator />
					<DropdownMenuItem className="flex gap-2" onClick={handleSignOut}>
						<LogOut />
						Sign out
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</nav>
	);
}

export function MobileDashboardNav({
	user,
	isAdmin,
}: {
	user: UserDTO;
	isAdmin: boolean;
}) {
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
			<SheetContent side="top" className="h-full p-0">
				<SheetClose className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none">
					<X className="h-4 w-4" />
					<span className="sr-only">Close</span>
				</SheetClose>
				<DashboardNav user={user} isAdmin={isAdmin} />
			</SheetContent>
		</Sheet>
	);
}
