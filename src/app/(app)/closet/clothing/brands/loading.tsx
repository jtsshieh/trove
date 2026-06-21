import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
	return (
		<div className="h-svh w-screen p-8">
			<Skeleton className="mb-4 size-9" />
			<div className="flex justify-between">
				<div className="space-y-2">
					<Skeleton className="h-9 w-32" />
					<Skeleton className="mb-4 h-5 w-96 max-w-full" />
				</div>
				<Skeleton className="h-9 w-32" />
			</div>
			<div className="grid grid-cols-4 gap-2">
				{Array.from({ length: 8 }).map((_, i) => (
					<Skeleton key={i} className="h-32 w-full rounded-xl" />
				))}
			</div>
		</div>
	);
}
