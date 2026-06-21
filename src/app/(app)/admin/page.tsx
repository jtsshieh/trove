import { Server, Users } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';

const SECTIONS = [
	{
		name: 'Users',
		href: '/admin/users',
		icon: Users,
		description: 'Create accounts and manage roles.',
	},
	{
		name: 'System',
		href: '/admin/system',
		icon: Server,
		description: 'Check for and apply updates.',
	},
] as const;

export default function AdminOverview() {
	return (
		<div className="mx-auto w-full max-w-screen-lg">
			<div className="mb-6">
				<h1 className="text-3xl font-bold">Admin</h1>
				<p className="text-neutral-600">Manage this server.</p>
			</div>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				{SECTIONS.map((s) => (
					<Link key={s.href} href={s.href} className="group">
						<Card className="hover:border-brand h-full transition-colors group-hover:shadow-sm">
							<CardHeader>
								<s.icon className="text-brand mb-2 size-7" />
								<CardTitle>{s.name}</CardTitle>
								<CardDescription>{s.description}</CardDescription>
							</CardHeader>
						</Card>
					</Link>
				))}
			</div>
		</div>
	);
}
