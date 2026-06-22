import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import React, { ReactNode, Suspense } from 'react';

import { AppShell } from '@/components/app-shell/app-shell';
import { DisplayModeProvider } from '@/components/display-mode';
import { getCurrentUserSafe, getUserSettings, isAdmin } from '@/lib/auth';

import {
	MobileTripNavSkeleton,
	TripSideNavSkeleton,
} from './_components/trip-nav-skeleton';
import { getTrip } from './_data/fetchers';
import { SIDEBAR_COOKIE } from './sidebar-cookie';
import { MobileTripNav, TripSideNav } from './trip-nav';

/**
 * The trip-viewer frame: it awaits only the cheap reads needed to paint the shell
 * (current user, settings, the sidebar-collapsed cookie) and renders immediately.
 * The heavy getTrip read — which the rail's heading + mode-gated nav depend on —
 * streams in its own <Suspense> so navigating into a trip never blocks on the DB.
 */
export default async function TripViewerLayout({
	children,
	params,
}: {
	children: ReactNode;
	params: Promise<{ tripId: string }>;
}) {
	const { tripId } = await params;
	const [settings, cookieStore, user] = await Promise.all([
		getUserSettings(),
		cookies(),
		getCurrentUserSafe(),
	]);

	const navCollapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === 'true';

	return (
		<AppShell
			appId="trip-planner"
			username={user.username}
			isAdmin={isAdmin(user)}
			sections={[]}
			contentClassName="flex min-h-0 flex-1 overflow-hidden"
		>
			<DisplayModeProvider initial={settings.displayMode}>
				<div className="flex min-h-0 w-full flex-1 flex-col md:flex-row">
					<div className="hidden md:block">
						<Suspense
							fallback={<TripSideNavSkeleton collapsed={navCollapsed} />}
						>
							<TripSideNavData tripId={tripId} collapsed={navCollapsed} />
						</Suspense>
					</div>
					<div className="w-full border-b p-2 px-4 md:hidden">
						<Suspense fallback={<MobileTripNavSkeleton />}>
							<MobileTripNavData tripId={tripId} />
						</Suspense>
					</div>
					<div className="bg-surface-sunken flex min-h-0 flex-1 scroll-pt-20 flex-col overflow-y-auto scroll-smooth p-4 sm:p-8">
						{children}
					</div>
				</div>
			</DisplayModeProvider>
		</AppShell>
	);
}

/** Awaits the cache()d trip and renders the desktop rail (one DB hit per request). */
async function TripSideNavData({
	tripId,
	collapsed,
}: {
	tripId: string;
	collapsed: boolean;
}) {
	const trip = await getTrip(tripId);
	if (!trip) return notFound();
	return <TripSideNav trip={trip} defaultCollapsed={collapsed} />;
}

/** Awaits the same cache()d trip and renders the mobile nav trigger. */
async function MobileTripNavData({ tripId }: { tripId: string }) {
	const trip = await getTrip(tripId);
	if (!trip) return notFound();
	return <MobileTripNav trip={trip} />;
}
