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
import { accentStyle, getApp, LAUNCHER_APPS } from '@/lib/apps';
import { cn } from '@/lib/utils';

import { AccountMenu } from './account-menu';
import { AppTiles } from './app-tiles';

export interface AppSection {
	name: string;
	href: Route;
	icon: React.ReactNode;
}

/**
 * Top-bar shell every app renders. Derives the app's name/icon/accent from the
 * registry by `appId`; the accent re-themes the `brand` color role for the whole
 * subtree (icons, active tabs, buttons) via CSS-var overrides on the root.
 */
export function AppShell({
	appId,
	sections,
	username,
	isAdmin,
	children,
}: {
	appId: string;
	sections: AppSection[];
	username: string;
	isAdmin: boolean;
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const [switcherOpen, setSwitcherOpen] = useState(false);
	const app = getApp(appId);
	const Icon = app?.icon;
	const switcherApps = LAUNCHER_APPS.filter((a) => !a.adminOnly || isAdmin);

	return (
		<div
			className="flex h-svh w-full flex-col"
			style={app ? accentStyle(app.accent) : undefined}
		>
			<nav className="flex items-center justify-between gap-4 border-b px-4 py-2">
				<div className="flex items-center gap-2">
					<Popover open={switcherOpen} onOpenChange={setSwitcherOpen}>
						<PopoverTrigger
							render={
								<button
									type="button"
									aria-label="All apps"
									className="inline-flex size-9 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"
								/>
							}
						>
							<Grid3x3 className="size-5" />
						</PopoverTrigger>
						<PopoverContent align="start" className="w-auto">
							<AppTiles
								apps={switcherApps}
								size="sm"
								onNavigate={() => setSwitcherOpen(false)}
							/>
						</PopoverContent>
					</Popover>
					<span className="flex items-center gap-2 px-1 font-bold">
						{Icon && <Icon className="text-brand size-5" />}
						{app?.name ?? 'Closet Manager'}
					</span>
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
