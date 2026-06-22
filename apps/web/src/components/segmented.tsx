'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
	value: T;
	label?: ReactNode;
	icon?: ReactNode;
	title?: string;
}

/** A compact segmented control on the tinted panel surface (view/display toggles). */
export function Segmented<T extends string>({
	value,
	onValueChange,
	options,
	className,
}: {
	value: T;
	onValueChange: (value: T) => void;
	options: SegmentedOption<T>[];
	className?: string;
}) {
	return (
		<div
			role="tablist"
			className={cn(
				'inline-flex items-center gap-0.5 rounded-lg bg-panel p-0.5',
				className,
			)}
		>
			{options.map((option) => {
				const active = option.value === value;
				return (
					<button
						key={option.value}
						type="button"
						role="tab"
						aria-selected={active}
						title={option.title}
						onClick={() => onValueChange(option.value)}
						className={cn(
							'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium transition-[color,background-color,box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-out)] [&_svg]:size-4',
							active
								? 'bg-card text-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground',
						)}
					>
						{option.icon}
						{option.label}
					</button>
				);
			})}
		</div>
	);
}
