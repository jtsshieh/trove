'use client';

import { Shirt } from 'lucide-react';

import { imageSrc } from '@/lib/images';
import { cn } from '@/lib/utils';

import type { OutfitWithItems } from '../_data/fetchers';

/**
 * Picture-forward cover for an outfit. Uses the explicit cover photo when set,
 * otherwise stitches a montage from the pieces' photos so the library stays
 * visual even before a cover is chosen.
 */
export function OutfitMontage({
	outfit,
	className,
}: {
	outfit: OutfitWithItems;
	className?: string;
}) {
	if (outfit.imageKey) {
		return (
			<div
				className={cn('relative overflow-hidden bg-muted', className)}
				aria-hidden
			>
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={imageSrc(outfit.imageKey)}
					alt=""
					loading="lazy"
					className="size-full object-cover"
				/>
			</div>
		);
	}

	const photos = outfit.items
		.map((item) => item.clothing.imageKey)
		.filter((key): key is string => Boolean(key))
		.slice(0, 4);

	if (photos.length === 0) {
		return (
			<div
				className={cn(
					'flex items-center justify-center bg-muted text-muted-foreground',
					className,
				)}
				aria-hidden
			>
				<Shirt className="size-1/4 opacity-30" />
			</div>
		);
	}

	return (
		<div
			className={cn(
				'grid gap-px overflow-hidden bg-border',
				photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2',
				className,
			)}
			aria-hidden
		>
			{photos.map((key, i) => (
				<div
					key={key}
					className={cn(
						'relative bg-muted',
						// a lone third photo spans the full bottom row
						photos.length === 3 && i === 2 && 'col-span-2',
					)}
				>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src={imageSrc(key)}
						alt=""
						loading="lazy"
						className="size-full object-cover"
					/>
				</div>
			))}
		</div>
	);
}
