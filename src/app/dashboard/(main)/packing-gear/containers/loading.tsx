import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
	return (
		<>
			<div className="mb-4 flex items-center justify-between gap-4">
				<Skeleton className="h-5 w-96 max-w-full" />
				<div className="flex gap-2">
					<Skeleton className="size-9" />
					<Skeleton className="h-9 w-32" />
				</div>
			</div>
			<div className="grid auto-rows-fr grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
				{Array.from({ length: 5 }).map((_, i) => (
					<Skeleton key={i} className="h-32 w-full rounded-xl" />
				))}
			</div>
		</>
	);
}
