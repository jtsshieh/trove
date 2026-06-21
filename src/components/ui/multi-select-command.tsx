'use client';

import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandList,
	CommandItem,
} from '@/components/ui/command';
import { ItemDisplay } from '@/components/ui/item-display';
import { DisplayMode } from '@/generated/prisma/enums';
import { cn } from '@/lib/utils';

export interface MultiSelectGroup<T> {
	heading: string;
	items: T[];
}

/**
 * Searchable multi-select on cmdk. Drives the built-in `data-checked` check hook
 * (no command.tsx edit). Already-added items show checked + disabled (teaching,
 * vs hiding them), so several can be added in one action.
 */
export function MultiSelectCommand<T>({
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
}) {
	const selected = new Set(value);

	function toggle(key: string) {
		if (disabledKeys?.has(key)) return;
		const next = new Set(selected);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		onValueChange([...next]);
	}

	return (
		<Command className={cn('bg-transparent', className)}>
			<CommandInput placeholder={placeholder} />
			<CommandList>
				<CommandEmpty>{emptyText}</CommandEmpty>
				{groups.map(
					(group) =>
						group.items.length > 0 && (
							<CommandGroup key={group.heading} heading={group.heading}>
								{group.items.map((item) => {
									const key = getKey(item);
									const checked = selected.has(key);
									const disabled = disabledKeys?.has(key);
									return (
										<CommandItem
											key={key}
											value={key}
											keywords={[getLabel(item)]}
											data-checked={checked || disabled || undefined}
											disabled={disabled}
											onSelect={() => toggle(key)}
										>
											<ItemDisplay
												name={getLabel(item)}
												imageKey={getImageKey?.(item)}
												size="chip"
												mode={getImageKey ? DisplayMode.Both : DisplayMode.TextOnly}
											/>
										</CommandItem>
									);
								})}
							</CommandGroup>
						),
				)}
			</CommandList>
		</Command>
	);
}
