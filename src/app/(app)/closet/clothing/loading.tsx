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
					<Skeleton className="h-9 w-32" />
				</div>
				<div className="flex flex-1 flex-col gap-8">
					{Array.from({ length: 2 }).map((_, i) => (
						<div key={i}>
							<Skeleton className="mb-2 h-7 w-32" />
							<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
								{Array.from({ length: 5 }).map((_, j) => (
									<Skeleton key={j} className="h-32 w-full rounded-xl" />
								))}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
