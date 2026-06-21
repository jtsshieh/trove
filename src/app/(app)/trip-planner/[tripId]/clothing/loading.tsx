import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
	return (
		<>
			<div className="border-border bg-surface-sunken/85 sticky -top-8 z-[var(--z-sticky)] -mx-8 mb-6 flex items-center gap-3 border-b px-8 py-4 backdrop-blur">
				<Skeleton className="size-10 rounded-lg" />
				<div className="flex-1 space-y-2">
					<Skeleton className="h-5 w-28" />
					<Skeleton className="h-3.5 w-40" />
				</div>
				<Skeleton className="h-8 w-20 rounded-lg" />
				<Skeleton className="h-8 w-24 rounded-lg" />
				<Skeleton className="h-8 w-28 rounded-lg" />
			</div>
			<div className="flex flex-col gap-3">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="bg-panel flex flex-col gap-2 rounded-xl p-3">
						<div className="flex items-center justify-between">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-5 w-14 rounded-md" />
						</div>
						<Skeleton className="h-7 w-full rounded-md" />
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
							{Array.from({ length: 3 }).map((_, j) => (
								<Skeleton key={j} className="h-9 w-full rounded-lg" />
							))}
						</div>
					</div>
				))}
			</div>
		</>
	);
}
