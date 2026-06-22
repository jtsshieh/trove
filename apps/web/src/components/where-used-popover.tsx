'use client';

import { Repeat } from 'lucide-react';
import type { ReactNode } from 'react';

import {
	Popover,
	PopoverContent,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from '@/components/ui/popover';

/**
 * "reused ×N" badge that reveals where a piece is used this trip. The badge value
 * is the reuse count — placements beyond what the trip is bringing — so it renders
 * nothing until a piece is re-worn past its bringing count. The popover still lists
 * every placement (`placeCount`) so the user can see where each one sits.
 */
export function WhereUsedPopover({
	reuseCount,
	placeCount,
	places,
}: {
	reuseCount: number;
	placeCount: number;
	places: ReactNode[];
}) {
	if (reuseCount <= 0) return null;
	return (
		<Popover>
			<PopoverTrigger
				data-testid="reuse-badge"
				className="bg-brand-subtle text-brand hover:bg-brand-subtle/80 inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.65rem] font-medium transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)]"
			>
				<Repeat className="size-3" />×{reuseCount}
			</PopoverTrigger>
			<PopoverContent className="w-56" align="start">
				<PopoverHeader>
					<PopoverTitle>
						Reused ×{reuseCount} · placed {placeCount}× this trip
					</PopoverTitle>
				</PopoverHeader>
				<ul className="flex flex-col gap-1 text-sm">
					{places.map((place, i) => (
						<li key={i} className="text-muted-foreground truncate">
							{place}
						</li>
					))}
				</ul>
			</PopoverContent>
		</Popover>
	);
}
