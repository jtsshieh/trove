import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
	return (
		<>
			<div className="sticky -top-6 mb-4 flex items-center gap-4 rounded-xl bg-neutral-200/75 p-2 backdrop-blur">
				<Skeleton className="size-10 rounded-lg" />
				<div className="flex-1 space-y-2">
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-4 w-72 max-w-full" />
				</div>
				<Skeleton className="h-9 w-28" />
			</div>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				{Array.from({ length: 4 }).map((_, i) => (
					<Skeleton key={i} className="h-40 w-full rounded-xl" />
				))}
			</div>
		</>
	);
}
