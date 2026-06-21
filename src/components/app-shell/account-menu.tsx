'use client';

import { Grid3x3, LogOut, Server, Settings } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import { signOut } from '@/app/(auth)/_data/api';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function AccountMenu({
	username,
	isAdmin,
}: {
	username: string;
	isAdmin: boolean;
}) {
	const router = useRouter();
	const handleSignOut = async () => {
		await signOut();
		router.push('/sign-in');
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<button
						type="button"
						aria-label="Account menu"
						className="rounded-full select-none"
					/>
				}
			>
				<Avatar>
					<AvatarFallback>:)</AvatarFallback>
				</Avatar>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuLabel>{username}</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					className="flex gap-2"
					nativeButton={false}
					render={<Link href="/" />}
				>
					<Grid3x3 />
					All apps
				</DropdownMenuItem>
				<DropdownMenuItem
					className="flex gap-2"
					nativeButton={false}
					render={<Link href="/account" />}
				>
					<Settings />
					Settings
				</DropdownMenuItem>
				{isAdmin && (
					<DropdownMenuItem
						className="flex gap-2"
						nativeButton={false}
						render={<Link href="/admin" />}
					>
						<Server />
						Admin
					</DropdownMenuItem>
				)}
				<DropdownMenuSeparator />
				<DropdownMenuItem className="flex gap-2" onClick={handleSignOut}>
					<LogOut />
					Sign out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
