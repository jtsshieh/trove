import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
	return (
		<div className="flex w-full flex-1 justify-center">
			<div className="flex w-full max-w-screen-2xl flex-1 flex-col">
				<div className="mb-4 flex items-start justify-between gap-4 border-b pb-4">
					<div className="flex-1 space-y-2">
						<Skeleton className="h-9 w-48" />
						<Skeleton className="h-5 w-96 max-w-full" />
					</div>
					<Skeleton className="size-9 sm:h-10 sm:w-36" />
				</div>
				<div className="flex flex-col gap-8">
					{Array.from({ length: 2 }).map((_, group) => (
						<div key={group}>
							<Skeleton className="mb-2 h-7 w-40" />
							<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
								{Array.from({ length: 4 }).map((_, i) => (
									<Skeleton key={i} className="h-56 w-full rounded-xl" />
								))}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
