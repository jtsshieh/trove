import { LoaderCircle } from 'lucide-react';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import React, { ReactNode, Suspense } from 'react';

import { DisplayModeProvider } from '@/components/display-mode';
import { getUserSettings } from '@/app/dashboard/(main)/account/_data/fetchers';

import { getTrip } from './_data/fetchers';
import { SIDEBAR_COOKIE } from './sidebar-cookie';
import { MobileTripNav, TripSideNav } from './trip-nav';

async function TripViewerLayout({
	children,
	params,
}: {
	children: ReactNode;
	params: Promise<{ tripId: string }>;
}) {
	const { tripId } = await params;
	const [trip, settings, cookieStore] = await Promise.all([
		getTrip(tripId),
		getUserSettings(),
		cookies(),
	]);
	if (!trip) return notFound();

	const navCollapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === 'true';

	return (
		<DisplayModeProvider initial={settings.displayMode}>
			<div className="flex h-svh w-screen flex-col">
				<div className="flex min-h-0 flex-1 flex-col md:flex-row">
					<div className="hidden md:block">
						<TripSideNav trip={trip} defaultCollapsed={navCollapsed} />
					</div>
					<div className="w-full border-b p-2 px-4 md:hidden">
						<MobileTripNav trip={trip} />
					</div>
					<div className="flex min-h-0 flex-1 scroll-pt-20 flex-col overflow-y-auto scroll-smooth bg-surface-sunken p-4 sm:p-8">
						{children}
					</div>
				</div>
			</div>
		</DisplayModeProvider>
	);
}

function TripViewerLoading() {
	return (
		<div className="flex h-svh w-screen items-center justify-center">
			<LoaderCircle className="h-8 w-8 animate-spin" />
		</div>
	);
}

export default function TripViewerLayoutSuspended(props: {
	children: ReactNode;
	params: Promise<{ tripId: string }>;
}) {
	return (
		<Suspense fallback={<TripViewerLoading />}>
			<TripViewerLayout {...props} />
		</Suspense>
	);
}
