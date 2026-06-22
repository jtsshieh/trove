import { cn } from '@/lib/utils';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * The desktop left-rail placeholder shown while the trip (its name + mode-gated
 * nav) streams in. Matches the rail's width + collapsed state so the frame never
 * shifts when the real <TripSideNav> resolves.
 */
export function TripSideNavSkeleton({
	collapsed = false,
}: {
	collapsed?: boolean;
}) {
	return (
		<div
			className={cn(
				'flex h-full min-h-0 flex-col gap-2 overflow-hidden sm:border-r',
				collapsed ? 'w-16' : 'w-64',
			)}
		>
			<div
				className={cn(
					'flex flex-col border-b',
					collapsed ? 'gap-3 px-2 pt-6 pb-4' : 'gap-4 px-6 pt-6 pb-4',
				)}
			>
				<div
					className={cn(
						'flex items-center gap-2',
						collapsed && 'justify-center',
					)}
				>
					{!collapsed && (
						<div className="flex min-w-0 flex-1 flex-col gap-1.5">
							<Skeleton className="h-5 w-32" />
							<Skeleton className="h-3.5 w-24" />
						</div>
					)}
					<Skeleton className="size-7 shrink-0 rounded-md" />
				</div>
				<Skeleton
					className={cn('rounded-md', collapsed ? 'size-7 self-center' : 'h-9 w-full')}
				/>
			</div>
			<div
				className={cn('flex flex-col gap-1', collapsed ? 'px-2 py-2' : 'p-4')}
			>
				{Array.from({ length: 5 }).map((_, i) => (
					<Skeleton
						key={i}
						className={cn('rounded-md', collapsed ? 'mx-auto size-9' : 'h-9 w-full')}
					/>
				))}
			</div>
		</div>
	);
}

/** The mobile trip-nav placeholder: just the menu trigger button. */
export function MobileTripNavSkeleton() {
	return <Skeleton className="size-9 rounded-lg" />;
}
