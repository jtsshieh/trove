'use client';

import { Check, Search } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

import { Input } from '@/components/ui/input';
import { imageSrc } from '@/lib/images';
import { cn } from '@/lib/utils';

import type { MultiSelectGroup } from './multi-select-command';

/** Searchable, picture-first GRID multi-select. Same API as MultiSelectCommand, but
 *  a gallery of image cards you click to toggle. Selected = ring + check badge. */
export function MultiSelectGallery<T>({
	groups,
	getKey,
	getLabel,
	getImageKey,
	value,
	onValueChange,
	disabledKeys,
	placeholder = 'Search…',
	emptyText = 'No matches.',
	className,
	fallbackIcon,
}: {
	groups: MultiSelectGroup<T>[];
	getKey: (item: T) => string;
	getLabel: (item: T) => string;
	getImageKey?: (item: T) => string | null | undefined;
	value: string[];
	onValueChange: (value: string[]) => void;
	disabledKeys?: Set<string>;
	placeholder?: string;
	emptyText?: string;
	className?: string;
	fallbackIcon?: ReactNode;
}) {
	const [query, setQuery] = useState('');
	const selected = new Set(value);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return groups
			.map((g) => ({
				heading: g.heading,
				items: q
					? g.items.filter((it) => getLabel(it).toLowerCase().includes(q))
					: g.items,
			}))
			.filter((g) => g.items.length > 0);
	}, [groups, query, getLabel]);

	function toggle(key: string) {
		if (disabledKeys?.has(key)) return;
		const next = new Set(selected);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		onValueChange([...next]);
	}

	return (
		<div className={cn('flex min-h-0 flex-col gap-3', className)}>
			<div className="relative shrink-0">
				<Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
				<Input
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder={placeholder}
					className="pl-9"
				/>
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto pr-1">
				{filtered.length === 0 ? (
					<p className="text-muted-foreground py-8 text-center text-sm">
						{emptyText}
					</p>
				) : (
					<div className="flex flex-col gap-4">
						{filtered.map((group) => (
							<div key={group.heading} className="flex flex-col gap-2">
								<h4 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
									{group.heading}
								</h4>
								<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
									{group.items.map((item) => {
										const key = getKey(item);
										const isSelected = selected.has(key);
										const disabled = disabledKeys?.has(key) ?? false;
										const name = getLabel(item);
										const img = getImageKey?.(item);
										return (
											<button
												type="button"
												key={key}
												disabled={disabled}
												aria-pressed={isSelected}
												onClick={() => toggle(key)}
												className={cn(
													// No overflow-hidden on the card itself: it clipped the name's
													// 2nd line + the bottom ring. Only the IMAGE is clipped (below).
													'group/card ring-foreground/10 bg-card relative flex flex-col rounded-lg text-left ring-1 outline-none transition-[box-shadow,opacity] duration-[var(--dur-fast)] ease-[var(--ease-out)]',
													'hover-hover:hover:ring-foreground/25 focus-visible:ring-ring focus-visible:ring-2',
													isSelected && 'ring-foreground ring-2',
													disabled && 'cursor-not-allowed opacity-40',
												)}
											>
												<div className="bg-muted text-muted-foreground relative aspect-square w-full shrink-0 overflow-hidden rounded-t-lg">
													{img ? (
														// eslint-disable-next-line @next/next/no-img-element
														<img
															src={imageSrc(img)}
															alt={name}
															loading="lazy"
															className="size-full object-cover"
														/>
													) : (
														<span className="absolute inset-0 m-auto flex items-center justify-center opacity-40">
															{fallbackIcon}
														</span>
													)}
													<span
														className={cn(
															'absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full ring-1 transition-[opacity,transform] duration-[var(--dur-fast)]',
															isSelected
																? 'bg-foreground text-background ring-foreground scale-100 opacity-100'
																: 'bg-card/80 ring-foreground/15 scale-90 text-transparent opacity-0 group-hover/card:opacity-100',
														)}
													>
														<Check className="size-3.5" />
													</span>
												</div>
												<span className="line-clamp-2 px-2 py-1.5 text-xs leading-tight font-medium [overflow-wrap:anywhere]">
													{name}
												</span>
											</button>
										);
									})}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
