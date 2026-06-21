import { redirect } from 'next/navigation';

import { DEFAULT_CLOTHING_TYPES } from '@/lib/clothing-types-catalog';
import { prisma } from '@/lib/db.server';

import { SetupWizard } from './setup-wizard';

export default async function SetupPage() {
	// First-run only: once any user exists, setup is closed.
	if ((await prisma.user.count()) > 0) redirect('/');
	return <SetupWizard catalog={DEFAULT_CLOTHING_TYPES} />;
}
