import { Layers, Map } from 'lucide-react';

import type { AppSection } from '@/components/app-shell/app-shell';

/**
 * The trips app's top-bar nav: the trips list and the reusable
 * essential-group templates. Shared by every top-level trips page so the tabs
 * stay consistent. (The per-trip board has its own left rail in `[tripId]/trip-nav`.)
 */
export const TRIP_PLANNER_SECTIONS: AppSection[] = [
	{ name: 'Trips', href: '/trips', icon: <Map className="size-4" /> },
	{
		name: 'Templates',
		href: '/trips/templates',
		icon: <Layers className="size-4" />,
	},
];
