import { redirect } from 'next/navigation';
import React from 'react';

import { getCurrentUserSafe, isAdmin } from '../account/_data/fetchers';
import { SystemClient } from './system-client';

export default async function SystemPage() {
	const user = await getCurrentUserSafe();
	if (!isAdmin(user)) redirect('/dashboard');

	return (
		<div className="flex w-full justify-center">
			<div className="w-full max-w-screen-md">
				<div className="mb-4 flex flex-col gap-1">
					<h1 className="text-3xl font-bold">System</h1>
					<h2 className="text-base text-neutral-600">
						Check for and apply updates to this server.
					</h2>
				</div>
				<SystemClient />
			</div>
		</div>
	);
}
