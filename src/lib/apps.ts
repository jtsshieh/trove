import {
	Layers,
	Map,
	Settings,
	Shield,
	Shirt,
	type LucideIcon,
} from 'lucide-react';
import type { Route } from 'next';
import type { CSSProperties } from 'react';

export interface AppAccent {
	/** Saturated accent (oklch) for icons/active states/buttons. */
	base: string;
	/** Tint (oklch) for subtle backgrounds. */
	subtle: string;
}

/** Static registry of the apps. `launcher: false` hides it from the launcher grid
 * (but it still has shell chrome + an accent, e.g. Account). */
export interface AppDef {
	id: string;
	name: string;
	description: string;
	icon: LucideIcon;
	href: Route;
	accent: AppAccent;
	adminOnly?: boolean;
	launcher?: boolean;
}

export const APPS: AppDef[] = [
	{
		id: 'closet',
		name: 'Closet',
		description: 'Your clothing, essentials, and packing gear.',
		icon: Shirt,
		href: '/closet',
		accent: { base: 'oklch(0.52 0.16 270)', subtle: 'oklch(0.95 0.025 270)' },
	},
	{
		id: 'outfits',
		name: 'Outfits',
		description: 'Build and save outfits from your closet.',
		icon: Layers,
		href: '/outfits',
		accent: { base: 'oklch(0.58 0.19 15)', subtle: 'oklch(0.95 0.03 15)' },
	},
	{
		id: 'trip-planner',
		name: 'Trip Planner',
		description: 'Plan, provision, and pack for your trips.',
		icon: Map,
		href: '/trip-planner',
		accent: { base: 'oklch(0.6 0.12 195)', subtle: 'oklch(0.95 0.035 195)' },
	},
	{
		id: 'admin',
		name: 'Admin',
		description: 'Manage users, clothing types, and the system.',
		icon: Shield,
		href: '/admin',
		accent: { base: 'oklch(0.64 0.14 65)', subtle: 'oklch(0.95 0.04 70)' },
		adminOnly: true,
	},
	{
		id: 'account',
		name: 'Account',
		description: 'Your profile and settings.',
		icon: Settings,
		href: '/account',
		accent: { base: 'oklch(0.45 0.03 260)', subtle: 'oklch(0.95 0.012 260)' },
		launcher: false,
	},
];

export const LAUNCHER_APPS = APPS.filter((a) => a.launcher !== false);

export function getApp(id: string): AppDef | undefined {
	return APPS.find((a) => a.id === id);
}

/** Inline CSS-var overrides that re-theme the `brand` color role for an app. */
export function accentStyle(accent: AppAccent): CSSProperties {
	return {
		'--brand': accent.base,
		'--brand-subtle': accent.subtle,
		'--brand-foreground': 'oklch(0.985 0 0)',
		'--ring-brand': accent.base,
	} as CSSProperties;
}
