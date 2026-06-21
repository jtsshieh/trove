'use client';

import { Shirt } from 'lucide-react';
import type { ReactNode } from 'react';

import { useDisplayMode } from '@/components/display-mode';
import { DisplayMode } from '@/generated/prisma/enums';
import { imageSrc } from '@/lib/images';
import { cn } from '@/lib/utils';

export type ItemDisplaySize = 'chip' | 'calendar-box' | 'panel' | 'card';

const SIZES: Record<
	ItemDisplaySize,
	{ wrapper: string; image: string; label: string }
> = {
	chip: {
		wrapper: 'flex items-center gap-2.5',
		image: 'size-10 rounded-lg',
		label: 'truncate text-sm',
	},
	'calendar-box': {
		// Image-forward: a prominent square photo with the name beneath it, free to
		// wrap to two lines so a piece name never gets clipped to zero width in a
		// narrow calendar cell.
		wrapper: 'flex flex-col gap-1 text-center',
		image: 'aspect-square w-full rounded-lg',
		label:
			'line-clamp-2 text-xs leading-tight font-medium [overflow-wrap:anywhere]',
	},
	panel: {
		wrapper: 'flex items-center gap-2.5',
		image: 'size-12 rounded-lg',
		label: 'truncate text-sm',
	},
	card: {
		// Picture-forward vertical card: a big square photo on top with the name
		// below, free to wrap so a long piece name never clips. Used by the board's
		// "Large" piece-size mode and the picture-forward wardrobe grid.
		wrapper: 'flex flex-col gap-2',
		image: 'aspect-square w-full rounded-lg',
		label:
			'line-clamp-2 text-sm leading-tight font-medium [overflow-wrap:anywhere]',
	},
};

/**
 * The single tile for any item (clothing, essential, container, luggage, outfit).
 * Honors the user's text/picture/both preference (or an explicit `mode` override),
 * with a graceful icon fallback when there is no photo yet.
 */
export function ItemDisplay({
	name,
	imageKey,
	fallbackIcon,
	mode: modeProp,
	size = 'chip',
	meta,
	className,
}: {
	name: string;
	imageKey?: string | null;
	fallbackIcon?: ReactNode;
	mode?: DisplayMode;
	size?: ItemDisplaySize;
	meta?: ReactNode;
	className?: string;
}) {
	const contextMode = useDisplayMode();
	const mode = modeProp ?? contextMode;
	const showImage = mode !== DisplayMode.TextOnly;
	const showText = mode !== DisplayMode.PictureOnly;
	const s = SIZES[size];

	return (
		<div className={cn(s.wrapper, 'min-w-0', className)}>
			{showImage && (
				<div
					className={cn(
						'relative flex shrink-0 items-center justify-center overflow-hidden bg-muted text-muted-foreground',
						s.image,
					)}
				>
					{imageKey ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={imageSrc(imageKey)}
							alt={name}
							loading="lazy"
							className="size-full object-cover"
						/>
					) : (
						(fallbackIcon ?? <Shirt className="size-1/2 opacity-40" />)
					)}
				</div>
			)}
			{showText && (
				<div className="flex min-w-0 flex-col">
					<span className={s.label}>{name}</span>
					{meta && (
						<span className="text-muted-foreground truncate text-xs">
							{meta}
						</span>
					)}
				</div>
			)}
		</div>
	);
}
