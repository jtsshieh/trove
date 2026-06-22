import { Skeleton } from '@/components/ui/skeleton';

/**
 * Content-only board skeletons. The static <TripPageHeader> (icon + title +
 * description) always paints from the page itself; these fill only the parts that
 * stream — the header's right-aligned action row and the board body — so a
 * navigation never flashes a full-page placeholder.
 */

/** A button-row placeholder for the streamed header actions (DisplayToggle + dialog). */
export function HeaderActionsSkeleton() {
	return (
		<>
			<Skeleton className="h-8 w-9 rounded-lg" />
			<Skeleton className="h-8 w-28 rounded-lg" />
		</>
	);
}

/** A single day/lane card: a heading row plus a few item rows. */
function DayCardSkeleton() {
	return (
		<div className="bg-panel flex flex-col gap-2 rounded-xl p-3">
			<div className="flex items-center justify-between">
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-5 w-14 rounded-md" />
			</div>
			<Skeleton className="h-7 w-full rounded-md" />
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
				{Array.from({ length: 3 }).map((_, i) => (
					<Skeleton key={i} className="h-9 w-full rounded-lg" />
				))}
			</div>
		</div>
	);
}

/** A stacked list of day cards — the clothing list/essentials default body. */
export function DayCardListSkeleton({ count = 4 }: { count?: number }) {
	return (
		<div className="flex flex-col gap-3">
			{Array.from({ length: count }).map((_, i) => (
				<DayCardSkeleton key={i} />
			))}
		</div>
	);
}

/** A two-column grid of large card placeholders — the containers/luggage body. */
export function BoardGridSkeleton({ count = 4 }: { count?: number }) {
	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
			{Array.from({ length: count }).map((_, i) => (
				<Skeleton key={i} className="h-40 w-full rounded-xl" />
			))}
		</div>
	);
}

/**
 * The luggage provisioning body: a pool column beside a grid of suitcase cards,
 * with the progress bar above (the progress bar is data-dependent, so it streams
 * with the board content).
 */
export function LuggageBoardSkeleton() {
	return (
		<>
			<div className="mb-6 flex flex-col gap-1.5">
				<Skeleton className="h-4 w-full" />
			</div>
			<div className="grid gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
				<div className="flex flex-col gap-3">
					<Skeleton className="h-4 w-40" />
					<Skeleton className="h-64 w-full rounded-xl" />
				</div>
				<div className="grid auto-rows-min gap-4 xl:grid-cols-2">
					{Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={i} className="h-56 w-full rounded-xl" />
					))}
				</div>
			</div>
		</>
	);
}
