'use client';

import type { ReactNode } from 'react';
import { Layers, LifeBuoy } from 'lucide-react';

import { DropZone } from '@/components/dnd';
import { EmptyState } from '@/components/ui/empty-state';
import type { ItemDisplaySize } from '@/components/ui/item-display';
import { ProvisionSection } from '@/generated/prisma/enums';
import type { Zone } from '@/lib/dnd/zone';
import { cn } from '@/lib/utils';

import type { BoardProvision } from './types';

const META: Record<
	'Universal' | 'Backup',
	{ icon: ReactNode; title: string; blurb: string; description: string }
> = {
	Universal: {
		icon: <Layers />,
		title: 'Universal',
		blurb: 'Worn across the whole trip',
		description: 'Pieces that aren’t tied to a single day.',
	},
	Backup: {
		icon: <LifeBuoy />,
		title: 'Backup',
		blurb: 'Spares, just in case',
		description: 'Extras you’d pack but not plan around.',
	},
};

/** A day-agnostic lane (Universal or Backup) — a single titled drop zone. */
export function SectionLane({
	tripId,
	section,
	pieces,
	renderPiece,
	large,
}: {
	tripId: string;
	section: 'Universal' | 'Backup';
	pieces: BoardProvision[];
	renderPiece: (
		provision: BoardProvision,
		index: number,
		zone: Zone,
		size: ItemDisplaySize,
	) => ReactNode;
	/** "Large" piece-size mode: prominent picture-on-top cards in a fill grid. */
	large?: boolean;
}) {
	const meta = META[section];
	const zone: Zone = {
		kind: section === ProvisionSection.Universal ? 'universal' : 'backup',
		ownerId: tripId,
	};

	return (
		<section
			data-testid="section-lane"
			data-section={section}
			className="bg-panel flex flex-col gap-2 rounded-xl p-3"
		>
			<div className="flex items-baseline justify-between gap-2 px-0.5">
				<h2 className="[&_svg]:text-muted-foreground flex items-center gap-1.5 text-sm font-semibold [&_svg]:size-4">
					{meta.icon}
					{meta.title}
				</h2>
				<span className="text-muted-foreground text-xs">{meta.blurb}</span>
			</div>
			<DropZone
				zone={zone}
				accepts={['clothing']}
				className={cn(
					'data-[drop-target]:bg-brand-subtle min-h-12 rounded-lg transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)]',
					large
						? 'grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-2'
						: 'flex flex-col gap-1.5',
				)}
			>
				{pieces.length === 0 ? (
					<EmptyState
						icon={meta.icon}
						title={`No ${meta.title.toLowerCase()} pieces`}
						description={meta.description}
						className={cn(
							'w-full bg-transparent py-6',
							large && 'col-span-full',
						)}
					/>
				) : (
					pieces.map((p, i) => (
						<div key={p.id} className={cn(!large && 'w-full')}>
							{renderPiece(p, i, zone, large ? 'card' : 'chip')}
						</div>
					))
				)}
			</DropZone>
		</section>
	);
}
