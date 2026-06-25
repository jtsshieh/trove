import React from 'react';

import { getUserSettings } from '@/lib/auth';

import { getCurrentUserSafe } from './_data/fetchers';
import {
	DeleteAccountCard,
	PasswordCard,
	PreferencesCard,
	UsernameCard,
} from './account-settings-cards';
import { AuthCard } from './auth-card';

export default async function UserSettingsPage() {
	const [user, settings] = await Promise.all([
		getCurrentUserSafe(),
		getUserSettings(),
	]);

	return (
		<div className="flex w-full justify-center">
			<div className="w-full max-w-screen-md">
				<div className="mb-4 flex items-center justify-between">
					<h1 className="text-3xl font-bold">Account Settings</h1>
				</div>
				<div className="flex w-full flex-col gap-4">
					<UsernameCard user={user} />
					<PreferencesCard volumeUnit={settings.volumeUnit} />
					<PasswordCard />
					<AuthCard />
					<DeleteAccountCard />
				</div>
			</div>
		</div>
	);
}
