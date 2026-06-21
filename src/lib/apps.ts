import { Layers, Map, Shield, Shirt, type LucideIcon } from 'lucide-react';
import type { Route } from 'next';

/** Static registry of the apps shown on the launcher and in the app switcher. */
export interface AppDef {
	id: string;
	name: string;
	description: string;
	icon: LucideIcon;
	href: Route;
	adminOnly?: boolean;
}

export const APPS: AppDef[] = [
	{
		id: 'closet',
		name: 'Closet',
		description: 'Your clothing, essentials, and packing gear.',
		icon: Shirt,
		href: '/closet',
	},
	{
		id: 'outfits',
		name: 'Outfits',
		description: 'Build and save outfits from your closet.',
		icon: Layers,
		href: '/outfits',
	},
	{
		id: 'trip-planner',
		name: 'Trip Planner',
		description: 'Plan, provision, and pack for your trips.',
		icon: Map,
		href: '/trip-planner',
	},
	{
		id: 'admin',
		name: 'Admin',
		description: 'Manage users, clothing types, and the system.',
		icon: Shield,
		href: '/admin',
		adminOnly: true,
	},
];
