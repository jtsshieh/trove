import { redirect } from 'next/navigation';
import { PropsWithChildren } from 'react';

import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db.server';

export default async function AuthLayout({ children }: PropsWithChildren) {
	const user = await getCurrentUser();
	if (user) return redirect('/');
	// No users yet → first-run setup (covers hitting /sign-in directly on an empty DB).
	if ((await prisma.user.count()) === 0) return redirect('/setup');

	return <>{children}</>;
}
