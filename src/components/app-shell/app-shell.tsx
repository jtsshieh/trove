'use client';

import { Grid3x3 } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { APPS } from '@/lib/apps';
import { cn } from '@/lib/utils';

import { AccountMenu } from './account-menu';
import { AppTiles } from './app-tiles';

export interface AppSection {
	name: string;
	href: Route;
	icon: React.ReactNode;
}

/**
 * Top-bar shell every app renders: an app switcher (popover of all apps), the app
 * name, its section tabs (active by path prefix), and the account menu.
 */
export function AppShell({
	appName,
	sections,
	username,
	isAdmin,
	children,
}: {
	appName: string;
	sections: AppSection[];
	username: string;
	isAdmin: boolean;
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const [switcherOpen, setSwitcherOpen] = useState(false);
	const apps = APPS.filter((a) => !a.adminOnly || isAdmin);

	return (
		<div className="flex h-svh w-full flex-col">
			<nav className="flex items-center justify-between gap-4 border-b px-4 py-2">
				<div className="flex items-center gap-2">
					<Popover open={switcherOpen} onOpenChange={setSwitcherOpen}>
						<PopoverTrigger
							render={
								<button
									type="button"
									aria-label="All apps"
									className="inline-flex size-9 items-center justify-center rounded-md hover:bg-neutral-100"
								/>
							}
						>
							<Grid3x3 className="size-5" />
						</PopoverTrigger>
						<PopoverContent align="start" className="w-auto">
							<AppTiles
								apps={apps}
								size="sm"
								onNavigate={() => setSwitcherOpen(false)}
							/>
						</PopoverContent>
					</Popover>
					<span className="px-1 font-bold">{appName}</span>
					{sections.length > 0 && (
						<div className="ml-2 flex gap-1">
							{sections.map((s) => (
								<Button
									key={s.href}
									variant="ghost"
									className={cn(
										'flex justify-start gap-2',
										pathname.startsWith(s.href) &&
											'bg-brand-subtle text-brand hover:bg-brand-subtle hover:text-brand',
									)}
									nativeButton={false}
									render={<Link href={s.href} />}
								>
									{s.icon} {s.name}
								</Button>
							))}
						</div>
					)}
				</div>
				<AccountMenu username={username} isAdmin={isAdmin} />
			</nav>
			<div className="flex flex-1 overflow-auto border-t bg-neutral-50 p-8">
				{children}
			</div>
		</div>
	);
}
