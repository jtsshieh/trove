import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
	return (
		<div className="flex w-full flex-1 justify-center">
			<div className="flex w-full max-w-screen-2xl flex-1 flex-col">
				<div className="mb-4 flex items-center justify-between gap-4 border-b pb-4">
					<div className="flex-1 space-y-2">
						<Skeleton className="h-9 w-48" />
						<Skeleton className="h-5 w-96 max-w-full" />
					</div>
					<Skeleton className="size-9 sm:h-10 sm:w-36" />
				</div>
				<div className="flex flex-col gap-2">
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={i} className="h-16 w-full rounded-xl" />
					))}
				</div>
			</div>
		</div>
	);
}
