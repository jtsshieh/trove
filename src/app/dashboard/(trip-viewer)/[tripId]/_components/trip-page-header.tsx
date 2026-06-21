import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * The one uniform header for every trip-viewer tab — icon chip + title + optional
 * description and right-aligned actions. Sticky, on the recessed page canvas.
 */
export function TripPageHeader({
	icon,
	title,
	description,
	actions,
	className,
}: {
	icon?: ReactNode;
	title: ReactNode;
	description?: ReactNode;
	actions?: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				// Stacks on small screens so the title is never crushed by the actions;
				// becomes a single row from sm up. Padding/offset track the page padding
				// (p-4 on mobile, p-8 from sm) so the sticky bar stays flush.
				'sticky -top-4 z-[var(--z-sticky)] -mx-4 mb-6 flex flex-col gap-3 border-b border-border bg-surface-sunken/85 px-4 py-3 backdrop-blur sm:-top-8 sm:-mx-8 sm:flex-row sm:items-center sm:px-8 sm:py-4',
				className,
			)}
		>
			<div className="flex min-w-0 flex-1 items-center gap-3">
				{icon && (
					<span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-panel text-panel-foreground [&_svg]:size-5">
						{icon}
					</span>
				)}
				<div className="min-w-0 flex-1">
					<h1 className="truncate text-xl font-bold tracking-tight">{title}</h1>
					{description && (
						<div className="truncate text-sm text-muted-foreground">
							{description}
						</div>
					)}
				</div>
			</div>
			{actions && (
				<div className="flex shrink-0 flex-wrap items-center gap-2">
					{actions}
				</div>
			)}
		</div>
	);
}
