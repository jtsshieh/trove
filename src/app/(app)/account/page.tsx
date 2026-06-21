import React from 'react';

import { getCurrentUserSafe } from './_data/fetchers';
import {
	DeleteAccountCard,
	PasswordCard,
	UsernameCard,
} from './account-settings-cards';
import { AuthCard } from './auth-card';

export default async function UserSettingsPage() {
	const user = await getCurrentUserSafe();

	return (
		<div className="flex w-full justify-center">
			<div className="w-full max-w-screen-md">
				<div className="mb-4 flex items-center justify-between">
					<h1 className="text-3xl font-bold">Account Settings</h1>
				</div>
				<div className="flex w-full flex-col gap-4">
					<UsernameCard user={user} />
					<PasswordCard />
					<AuthCard />
					<DeleteAccountCard />
				</div>
			</div>
		</div>
	);
}
