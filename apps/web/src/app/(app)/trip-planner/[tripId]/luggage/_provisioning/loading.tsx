import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
	return (
		<div className="flex flex-col">
			<div className="border-border -mx-8 mb-6 flex items-center gap-3 border-b px-8 py-4">
				<Skeleton className="size-10 rounded-lg" />
				<div className="flex flex-1 flex-col gap-1.5">
					<Skeleton className="h-5 w-40" />
					<Skeleton className="h-4 w-72" />
				</div>
				<Skeleton className="h-8 w-32 rounded-lg" />
			</div>
			<div className="mb-6 flex flex-col gap-1.5">
				<Skeleton className="h-4 w-full" />
			</div>
			<div className="grid gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
				<div className="flex flex-col gap-3">
					<Skeleton className="h-4 w-40" />
					<Skeleton className="h-64 w-full rounded-xl" />
				</div>
				<div className="grid auto-rows-min gap-4 xl:grid-cols-2">
					<Skeleton className="h-56 w-full rounded-xl" />
					<Skeleton className="h-56 w-full rounded-xl" />
					<Skeleton className="h-56 w-full rounded-xl" />
					<Skeleton className="h-56 w-full rounded-xl" />
				</div>
			</div>
		</div>
	);
}
