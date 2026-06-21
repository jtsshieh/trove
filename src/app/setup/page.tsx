import { redirect } from 'next/navigation';

import { prisma } from '@/lib/db.server';

import { SetupWizard } from './setup-wizard';

export default async function SetupPage() {
	// First-run only: once any user exists, setup is closed.
	if ((await prisma.user.count()) > 0) redirect('/');
	return <SetupWizard />;
}
