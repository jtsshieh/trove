import { redirect } from 'next/navigation';

import { prisma } from '@/lib/db.server';

import { SetupWizard } from './setup-wizard';

// Reflects live DB state (whether any user exists yet) — must not be prerendered
// at build time, where there is no database.
export const dynamic = 'force-dynamic';

export default async function SetupPage() {
	// First-run only: once any user exists, setup is closed.
	if ((await prisma.user.count()) > 0) redirect('/');
	return <SetupWizard />;
}
