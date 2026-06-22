import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** A teaching empty state — what this area is for and how to fill it. */
export function EmptyState({
	icon,
	title,
	description,
	action,
	className,
}: {
	icon?: ReactNode;
	title: ReactNode;
	description?: ReactNode;
	action?: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				'flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed bg-card/40 px-6 py-10 text-center',
				className,
			)}
		>
			{icon && (
				<div className="mb-1 text-muted-foreground [&_svg]:size-7">{icon}</div>
			)}
			<p className="font-medium">{title}</p>
			{description && (
				<p className="max-w-xs text-sm text-muted-foreground">{description}</p>
			)}
			{action && <div className="mt-2">{action}</div>}
		</div>
	);
}
