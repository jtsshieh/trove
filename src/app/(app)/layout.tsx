import { redirect } from 'next/navigation';
import { PropsWithChildren } from 'react';

import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db.server';

/** Authed gate for every app + the launcher. Sends first-run visitors to /setup. */
export default async function AppLayout({ children }: PropsWithChildren) {
	const user = await getCurrentUser();
	if (!user) {
		if ((await prisma.user.count()) === 0) redirect('/setup');
		redirect('/sign-in');
	}
	return <>{children}</>;
}
