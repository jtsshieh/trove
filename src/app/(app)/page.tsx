import React from 'react';

import { AccountMenu } from '@/components/app-shell/account-menu';
import { AppTiles } from '@/components/app-shell/app-tiles';
import { LAUNCHER_APPS } from '@/lib/apps';
import { getCurrentUserSafe, isAdmin } from '@/lib/auth';

export default async function LauncherPage() {
	const user = await getCurrentUserSafe();
	const admin = isAdmin(user);
	const apps = LAUNCHER_APPS.filter((a) => !a.adminOnly || admin);

	return (
		<div className="flex h-svh w-full flex-col">
			<header className="flex items-center justify-between border-b px-6 py-3">
				<span className="text-lg font-bold">Closet Manager</span>
				<AccountMenu username={user.username} />
			</header>
			<main className="mx-auto w-full max-w-screen-lg flex-1 overflow-auto p-8">
				<AppTiles apps={apps} size="lg" />
			</main>
		</div>
	);
}
